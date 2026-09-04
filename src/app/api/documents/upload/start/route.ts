import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/document-access";
import { startResumableDriveUpload } from "@/lib/google";

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
    const body = (await request.json()) as {
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
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

    const sessionUrl = await startResumableDriveUpload({
      fileName,
      mimeType: body.mimeType?.trim() || "application/octet-stream",
      sizeBytes,
    });
    return NextResponse.json({ sessionUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start upload.";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
