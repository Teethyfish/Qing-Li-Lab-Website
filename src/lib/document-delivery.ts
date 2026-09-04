import { prisma } from "@/lib/prisma";

type DocumentUser = {
  id: string;
  role: "ADMIN" | "PI" | "MEMBER";
  isActive: boolean;
} | null;

export function documentAccessWhere(id: string, user: DocumentUser) {
  if (user?.isActive && user.role === "ADMIN") return { id };
  if (user?.isActive) {
    return {
      id,
      OR: [{ isPublic: true }, { recipients: { some: { userId: user.id } } }],
    };
  }
  return { id, isPublic: true };
}

export async function findAccessibleDocument(id: string, user: DocumentUser) {
  return prisma.labDocument.findFirst({ where: documentAccessWhere(id, user) });
}

export function documentContentDisposition(disposition: "inline" | "attachment", fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function copyDriveStreamHeaders(
  source: Headers,
  target: Headers,
  fallbackContentType: string
) {
  target.set("Content-Type", source.get("content-type") || fallbackContentType);
  target.set("Cache-Control", "private, no-store");
  target.set("Accept-Ranges", source.get("accept-ranges") || "bytes");
  target.set("X-Content-Type-Options", "nosniff");
  target.set("Cross-Origin-Resource-Policy", "same-origin");

  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = source.get(name);
    if (value) target.set(name, value);
  }
}

const SAFE_BITMAP_TYPES = new Set([
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const TEXT_APPLICATION_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/rtf",
  "application/xml",
  "application/yaml",
]);

export type DocumentViewerKind = "pdf" | "image" | "text" | "audio" | "video" | "unsupported";

export function documentViewerKind(mimeType: string): DocumentViewerKind {
  const normalized = mimeType.toLowerCase().split(";", 1)[0].trim();
  if (normalized === "application/pdf") return "pdf";
  if (SAFE_BITMAP_TYPES.has(normalized)) return "image";
  if (normalized.startsWith("text/") || TEXT_APPLICATION_TYPES.has(normalized)) return "text";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.startsWith("video/")) return "video";
  return "unsupported";
}

export function safeViewerContentType(mimeType: string) {
  return documentViewerKind(mimeType) === "text"
    ? "text/plain; charset=utf-8"
    : mimeType;
}
