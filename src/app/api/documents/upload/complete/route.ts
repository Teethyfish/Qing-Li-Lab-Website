import { MembershipStatus } from "@prisma/client";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { escapeHtml, requireAdminUser } from "@/lib/document-access";
import { getDriveDocumentMetadata, sendGoogleMail } from "@/lib/google";
import { prisma } from "@/lib/prisma";

const MEMBERSHIP_STATUSES = new Set(Object.values(MembershipStatus));

function formatUploadDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function documentEmailHtml(args: {
  recipientName: string;
  uploaderName: string;
  uploaderEmail: string;
  uploadedAt: Date;
  documentTitle: string;
  description: string;
  documentUrl: string;
}) {
  const recipientName = escapeHtml(args.recipientName);
  const uploaderName = escapeHtml(args.uploaderName);
  const uploaderEmail = escapeHtml(args.uploaderEmail);
  const uploader = args.uploaderName === args.uploaderEmail
    ? uploaderEmail
    : `${uploaderName} (${uploaderEmail})`;
  const uploadedAt = escapeHtml(formatUploadDate(args.uploadedAt));
  const documentTitle = escapeHtml(args.documentTitle);
  const description = escapeHtml(args.description).replaceAll("\n", "<br>");
  const documentUrl = escapeHtml(args.documentUrl);

  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f3f4f6;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">A new lab document is available: ${documentTitle}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #d1d5db;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:28px 32px;border-bottom:3px solid #1f2937;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#4b5563;">Qing X. Li Lab</p>
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#111827;">New Document Available</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Hello ${recipientName},</p>
              <p style="margin:0 0 22px;font-size:16px;line-height:1.6;">A document has been uploaded and shared with you through the lab website.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:collapse;">
                <tr>
                  <td style="width:120px;padding:9px 12px;background:#f9fafb;border:1px solid #d1d5db;font-size:14px;vertical-align:top;"><strong>Uploaded by</strong></td>
                  <td style="padding:9px 12px;border:1px solid #d1d5db;font-size:14px;vertical-align:top;">${uploader}</td>
                </tr>
                <tr>
                  <td style="width:120px;padding:9px 12px;background:#f9fafb;border:1px solid #d1d5db;font-size:14px;vertical-align:top;"><strong>Uploaded on</strong></td>
                  <td style="padding:9px 12px;border:1px solid #d1d5db;font-size:14px;vertical-align:top;">${uploadedAt}</td>
                </tr>
                <tr>
                  <td style="width:120px;padding:9px 12px;background:#f9fafb;border:1px solid #d1d5db;font-size:14px;vertical-align:top;"><strong>Document title</strong></td>
                  <td style="padding:9px 12px;border:1px solid #d1d5db;font-size:14px;vertical-align:top;"><strong>${documentTitle}</strong></td>
                </tr>
              </table>

              <h2 style="margin:0 0 8px;font-size:17px;line-height:1.4;color:#111827;">Description</h2>
              <div style="margin:0 0 26px;padding:14px 16px;background:#f9fafb;border-left:4px solid #4b5563;font-size:15px;line-height:1.65;">${description}</div>

              <p style="margin:0 0 24px;text-align:center;">
                <a href="${documentUrl}" style="display:inline-block;padding:12px 20px;background:#1f2937;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;border:1px solid #111827;">View ${documentTitle} on the Lab Website</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">If the button does not work, copy and paste this address into your browser:<br><a href="${documentUrl}" style="color:#374151;word-break:break-all;">${documentUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f9fafb;border-top:1px solid #d1d5db;font-size:12px;line-height:1.6;color:#6b7280;">
              This is an automated email from the Qing X. Li Lab website. Please do not reply to this message.<br>
              Qing X. Li Lab &ndash; Proteomics Core Facility
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
            href: `/documents/${documentId}`,
          })),
        },
      },
    });

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
    const documentUrl = `${siteUrl}/documents/${encodeURIComponent(document.id)}`;
    const emailResults = await Promise.allSettled(
      recipients.map(async (recipient) => {
        await sendGoogleMail({
          to: recipient.email,
          subject: emailSubject,
          html: documentEmailHtml({
            recipientName: recipient.name || "lab member",
            uploaderName: admin.name || admin.email,
            uploaderEmail: admin.email,
            uploadedAt: document.createdAt,
            documentTitle: title,
            description,
            documentUrl,
          }),
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
