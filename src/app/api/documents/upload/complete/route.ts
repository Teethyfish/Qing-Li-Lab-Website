import { MembershipStatus } from "@prisma/client";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { escapeHtml, requireAdminUser } from "@/lib/document-access";
import { getDriveDocumentMetadata, sendGoogleMail } from "@/lib/google";
import { prisma } from "@/lib/prisma";

const MEMBERSHIP_STATUSES = new Set(Object.values(MembershipStatus));

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const body = (await request.json()) as {
      driveFileId?: string;
      title?: string;
      description?: string;
      emailSubject?: string;
      isPublic?: boolean;
      groups?: string[];
      userIds?: string[];
    };
    const title = body.title?.trim();
    const description = body.description?.trim();
    const emailSubject = body.emailSubject?.trim();
    const driveFileId = body.driveFileId?.trim();
    if (!title || !description || !emailSubject || !driveFileId) {
      return NextResponse.json({ error: "Title, description, email title, and file are required." }, { status: 400 });
    }

    const groups = (body.groups || []).filter((value): value is MembershipStatus =>
      MEMBERSHIP_STATUSES.has(value as MembershipStatus)
    );
    const userIds = (body.userIds || []).filter((value) => typeof value === "string" && value);
    const recipientWhere = {
      OR: [
        ...(groups.length ? [{ membershipStatus: { in: groups } }] : []),
        ...(userIds.length ? [{ id: { in: userIds } }] : []),
      ],
    };
    const recipients = recipientWhere.OR.length
      ? await prisma.user.findMany({
          where: recipientWhere,
          select: { id: true, email: true, name: true },
        })
      : [];
    if (!body.isPublic && recipients.length === 0) {
      return NextResponse.json({ error: "Choose at least one recipient or make the document public." }, { status: 400 });
    }

    const driveFile = await getDriveDocumentMetadata(driveFileId);
    const documentId = crypto.randomUUID();
    const document = await prisma.labDocument.create({
      data: {
        id: documentId,
        title,
        description,
        emailSubject,
        fileName: driveFile.name,
        mimeType: driveFile.mimeType,
        sizeBytes: driveFile.sizeBytes,
        driveFileId: driveFile.id,
        isPublic: Boolean(body.isPublic),
        createdById: admin.id,
        recipients: {
          create: recipients.map((recipient) => ({ userId: recipient.id })),
        },
        notifications: {
          create: recipients.map((recipient) => ({
            userId: recipient.id,
            title: emailSubject,
            message: description,
            href: `/database#document-${documentId}`,
          })),
        },
      },
    });

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
    const emailResults = await Promise.allSettled(
      recipients.map(async (recipient) => {
        await sendGoogleMail({
          to: recipient.email,
          subject: emailSubject,
          html: `<p>Hello ${escapeHtml(recipient.name || "lab member")},</p>` +
            `<p>${escapeHtml(description).replaceAll("\n", "<br>")}</p>` +
            `<p><a href="${siteUrl}/database#document-${document.id}">Open the lab document database</a> to view and download <strong>${escapeHtml(title)}</strong>.</p>`,
        });
        return recipient.id;
      })
    );
    const notifiedUserIds = emailResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    );
    if (notifiedUserIds.length) {
      await prisma.documentRecipient.updateMany({
        where: { documentId: document.id, userId: { in: notifiedUserIds } },
        data: { notifiedAt: new Date() },
      });
    }

    return NextResponse.json({
      id: document.id,
      recipientCount: recipients.length,
      emailCount: notifiedUserIds.length,
      emailFailureCount: recipients.length - notifiedUserIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finish upload.";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
