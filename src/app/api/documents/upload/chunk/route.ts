import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/document-access";

export const runtime = "nodejs";

const MAX_CHUNK_BYTES = 2 * 1024 * 1024;
const ALLOWED_GOOGLE_UPLOAD_HOSTS = new Set([
  "www.googleapis.com",
  "content.googleapis.com",
]);

function validUploadUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ALLOWED_GOOGLE_UPLOAD_HOSTS.has(url.hostname) &&
      url.pathname.startsWith("/upload/drive/")
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();

    const uploadUrl = request.headers.get("x-drive-upload-url") || "";
    const contentRange = request.headers.get("content-range") || "";
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    if (!validUploadUrl(uploadUrl) || !/^bytes \d+-\d+\/\d+$/.test(contentRange)) {
      return NextResponse.json({ error: "Invalid upload session." }, { status: 400 });
    }

    const chunk = await request.arrayBuffer();
    if (!chunk.byteLength || chunk.byteLength > MAX_CHUNK_BYTES) {
      return NextResponse.json({ error: "Invalid upload chunk size." }, { status: 413 });
    }

    const googleResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": contentRange,
      },
      body: chunk,
      cache: "no-store",
      redirect: "manual",
    });

    if (googleResponse.status === 308) {
      const received = googleResponse.headers.get("range")?.match(/bytes=0-(\d+)/i);
      return NextResponse.json({
        complete: false,
        nextOffset: received ? Number(received[1]) + 1 : undefined,
      });
    }

    const result = await googleResponse.json().catch(() => null) as {
      id?: string;
      error?: { message?: string };
    } | null;
    if (!googleResponse.ok || !result?.id) {
      return NextResponse.json(
        { error: result?.error?.message || `Google Drive upload failed (${googleResponse.status}).` },
        { status: 502 }
      );
    }

    return NextResponse.json({ complete: true, id: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload document chunk.";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 500 }
    );
  }
}
