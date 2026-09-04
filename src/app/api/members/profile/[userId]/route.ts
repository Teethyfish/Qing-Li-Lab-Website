import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/document-access";
import type { ProfilePublication, ProfileTile, PublicProfileContent } from "@/lib/public-profile";
import { emptyPublicProfile } from "@/lib/public-profile";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ userId: string }> };
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

function safeUrl(value: unknown) {
  const candidate = text(value, 1_000);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch { return ""; }
}

function safeImage(value: unknown) {
  if (value === null || value === "") return "";
  if (typeof value !== "string" || value.length > 1_600_000) return "";
  return /^data:image\/(?:jpeg|png|webp);base64,/i.test(value) ? value : "";
}

function cleanProfile(value: unknown, fallbackEmail: string): PublicProfileContent {
  if (!value || typeof value !== "object") return emptyPublicProfile(fallbackEmail);
  const profile = value as Record<string, unknown>;
  const contactValue = profile.contact && typeof profile.contact === "object" ? profile.contact as Record<string, unknown> : {};
  const publications = Array.isArray(profile.publications)
    ? profile.publications.slice(0, 100).flatMap((value): ProfilePublication[] => {
        if (!value || typeof value !== "object") return [];
        const item = value as Record<string, unknown>;
        const id = text(item.id, 100);
        const title = text(item.title, 500);
        if (!id || !title) return [];
        return [{ id, title, citation: text(item.citation, 3_000), url: safeUrl(item.url) }];
      })
    : [];
  const tiles = Array.isArray(profile.tiles)
    ? profile.tiles.slice(0, 30).flatMap((value): ProfileTile[] => {
        if (!value || typeof value !== "object") return [];
        const item = value as Record<string, unknown>;
        const id = text(item.id, 100);
        const type = item.type === "photo" ? "photo" as const : "text" as const;
        const size = item.size === "wide" || item.size === "large" ? item.size : "standard";
        const title = text(item.title, 300);
        const imageUrl = type === "photo" ? safeImage(item.imageUrl) : "";
        if (!id || (type === "photo" && !imageUrl)) return [];
        return [{ id, type, size, title, content: text(item.content, 10_000), imageUrl }];
      })
    : [];
  const requestedEmail = text(contactValue.publicEmail, 320).toLowerCase();
  return {
    version: 1,
    contact: {
      publicEmail: /^\S+@\S+\.\S+$/.test(requestedEmail) ? requestedEmail : fallbackEmail,
      title: text(contactValue.title, 300),
      department: text(contactValue.department, 300),
      phone: text(contactValue.phone, 100),
      office: text(contactValue.office, 300),
      website: safeUrl(contactValue.website),
    },
    publications,
    tiles,
  };
}

export async function PUT(request: Request, { params }: Props) {
  const editor = await getCurrentUser();
  if (!editor?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;
  if (editor.id !== userId && editor.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 10_000_000) return NextResponse.json({ error: "Profile data is too large." }, { status: 413 });
  const raw = await request.text();
  if (raw.length > 10_000_000) return NextResponse.json({ error: "Profile data is too large." }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid profile data." }, { status: 400 }); }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, slug: true, imageUrl: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  const name = text(body.name, 160);
  const about = text(body.about, 12_000);
  if (typeof body.imageUrl === "string" && body.imageUrl !== target.imageUrl && !safeImage(body.imageUrl)) {
    return NextResponse.json({ error: "The profile image is too large or is not a supported image type." }, { status: 400 });
  }
  const requestedImage = body.imageUrl === null ? null : safeImage(body.imageUrl) || target.imageUrl;
  const profileContent = cleanProfile(body.profileContent, target.email);

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || null,
      about: about || null,
      imageUrl: requestedImage,
      profileContent: profileContent as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath("/members/profile");
  revalidatePath(`/members/profile/${userId}`);
  if (target.slug) revalidatePath(`/people/${target.slug}`);
  return NextResponse.json({ success: true });
}
