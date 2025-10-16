// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// simple slug cleaner: "Hoi Lam (Lynn) Zhang" -> "hoi-lam-lynn-zhang"
function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/register" });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { name?: string; email?: string; slug?: string; note?: string }
      | null;

    if (!body?.name || !body?.email || !body?.slug) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, slug" },
        { status: 400 }
      );
    }

    const name = body.name.trim();
    const email = body.email.trim().toLowerCase();
    const slug = toSlug(body.slug);

    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    if (!/^[a-z0-9-]{2,64}$/.test(slug)) {
      return NextResponse.json({ error: "Slug format invalid" }, { status: 400 });
    }

    const invite = await prisma.pendingInvite.upsert({
      where: { email },
      update: { name, slug, note: body.note ?? null, status: "PENDING" },
      create: { email, name, slug, note: body.note ?? null, status: "PENDING" },
    });

    return NextResponse.json({ ok: true, invite });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes("Unique constraint failed")) {
      return NextResponse.json(
        { error: "Email or slug already pending/used" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
