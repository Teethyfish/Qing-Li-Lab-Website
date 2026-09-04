import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/document-access";
import { getDriveDocumentMetadata } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const document = await prisma.labDocument.findUnique({ where: { id }, select: { driveFileId: true } });
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    const body = await request.json().catch(() => null) as { driveFileId?: unknown } | null;
    if (body?.driveFileId !== document.driveFileId) {
      return NextResponse.json({ error: "Replacement file does not match this document." }, { status: 400 });
    }
    const file = await getDriveDocumentMetadata(document.driveFileId);
    await prisma.labDocument.update({
      where: { id },
      data: { fileName: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not replace document.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}
