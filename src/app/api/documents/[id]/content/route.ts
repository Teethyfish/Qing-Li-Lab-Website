import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/document-access";
import {
  copyDriveStreamHeaders,
  documentContentDisposition,
  documentViewerKind,
  findAccessibleDocument,
  safeViewerContentType,
} from "@/lib/document-delivery";
import { downloadDriveDocument } from "@/lib/google";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  const document = await findAccessibleDocument(id, user);
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const viewerKind = documentViewerKind(document.mimeType, document.fileName);
  if (viewerKind === "unsupported" || viewerKind === "docx") {
    return NextResponse.json(
      { error: "This file type cannot be previewed safely in the browser." },
      { status: 415 }
    );
  }

  const driveResponse = await downloadDriveDocument(
    document.driveFileId,
    request.headers.get("range")
  );
  if (!driveResponse.ok || !driveResponse.body) {
    return NextResponse.json({ error: "The file is currently unavailable." }, { status: 502 });
  }

  const contentType = safeViewerContentType(document.mimeType);
  const headers = new Headers();
  copyDriveStreamHeaders(driveResponse.headers, headers, contentType);
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", documentContentDisposition("inline", document.fileName));

  return new NextResponse(driveResponse.body, { status: driveResponse.status, headers });
}
