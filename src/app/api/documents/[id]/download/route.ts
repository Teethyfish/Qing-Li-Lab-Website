import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/document-access";
import { downloadDriveDocument } from "@/lib/google";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

function contentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  const document = await prisma.labDocument.findFirst({
    where: {
      id,
      ...(user?.role === "ADMIN"
        ? {}
        : user
          ? { OR: [{ isPublic: true }, { recipients: { some: { userId: user.id } } }] }
          : { isPublic: true }),
    },
  });
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const driveResponse = await downloadDriveDocument(document.driveFileId);
  if (!driveResponse.ok || !driveResponse.body) {
    return NextResponse.json({ error: "The file is currently unavailable." }, { status: 502 });
  }

  if (user) {
    await prisma.documentRecipient.updateMany({
      where: { documentId: document.id, userId: user.id },
      data: { downloadedAt: new Date() },
    });
  }

  return new NextResponse(driveResponse.body, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": contentDisposition(document.fileName),
      "Cache-Control": "private, no-store",
    },
  });
}
