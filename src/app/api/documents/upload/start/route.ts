import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/document-access";
import { startResumableDriveUpload } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
    const body = (await request.json()) as {
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      documentId?: string;
    };
    const fileName = body.fileName?.trim();
    const sizeBytes = Number(body.sizeBytes);
    if (
      !fileName ||
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > 2_147_483_647
    ) {
      return NextResponse.json({ error: "Invalid file metadata." }, { status: 400 });
    }

    const documentId = body.documentId?.trim();
    const existingDocument = documentId
      ? await prisma.labDocument.findUnique({ where: { id: documentId }, select: { driveFileId: true } })
      : null;
    if (documentId && !existingDocument) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const sessionUrl = await startResumableDriveUpload({
      fileName,
      mimeType: body.mimeType?.trim() || "application/octet-stream",
      sizeBytes,
      fileId: existingDocument?.driveFileId,
    });
    return NextResponse.json({ sessionUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start upload.";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
