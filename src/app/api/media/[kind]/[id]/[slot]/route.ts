import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicProfileFromUnknown } from "@/lib/public-profile";

export const runtime = "nodejs";
type Props = { params: Promise<{ kind: string; id: string; slot: string }> };

function mediaResponse(value: string | null | undefined) {
  if (!value) return new NextResponse(null, { status: 404 });
  if (/^https?:\/\//i.test(value)) return NextResponse.redirect(value);
  const match = value.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return new NextResponse(null, { status: 404 });
  const bytes = Buffer.from(match[2], "base64");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": match[1].toLowerCase(),
      "Content-Length": String(bytes.length),
      // Every rendered URL contains the record's updatedAt value, so it can be
      // cached for a year and naturally changes whenever an editor saves it.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_: Request, { params }: Props) {
  const { kind, id, slot } = await params;
  if (kind === "announcement" && slot === "image") {
    const item = await prisma.announcement.findUnique({ where: { id }, select: { imageUrl: true } });
    return mediaResponse(item?.imageUrl);
  }
  if (kind === "user" && slot === "image") {
    const item = await prisma.user.findUnique({ where: { id }, select: { imageUrl: true } });
    return mediaResponse(item?.imageUrl);
  }
  if (kind === "user" && slot.startsWith("profile-")) {
    const item = await prisma.user.findUnique({ where: { id }, select: { email: true, profileContent: true } });
    if (!item) return new NextResponse(null, { status: 404 });
    const tileId = slot.slice("profile-".length);
    const tile = publicProfileFromUnknown(item.profileContent, item.email).tiles.find((candidate) => candidate.id === tileId && candidate.type === "photo");
    return mediaResponse(tile?.imageUrl);
  }
  if (kind === "instrument" && slot === "image") {
    const item = await prisma.instrument.findUnique({ where: { id }, select: { imageUrl: true } });
    return mediaResponse(item?.imageUrl);
  }
  if (kind === "project") {
    const item = await prisma.researchProject.findUnique({ where: { id }, select: { tileImageUrl: true, mainImageUrl: true, supportingImages: true } });
    if (!item) return new NextResponse(null, { status: 404 });
    if (slot === "tile") return mediaResponse(item.tileImageUrl);
    if (slot === "main") return mediaResponse(item.mainImageUrl);
    const index = slot.startsWith("supporting-") ? Number(slot.slice("supporting-".length)) : -1;
    const supporting = Array.isArray(item.supportingImages) ? item.supportingImages : [];
    return mediaResponse(Number.isInteger(index) && index >= 0 && typeof supporting[index] === "string" ? supporting[index] : null);
  }
  return new NextResponse(null, { status: 404 });
}
