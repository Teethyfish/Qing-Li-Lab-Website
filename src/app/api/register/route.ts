// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// server-side safety: normalize slug like the client does
function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body?.name ?? "").toString().trim();
    const email = (body?.email ?? "").toString().trim();
    const rawSlug = (body?.slug ?? "").toString();
    const note = (body?.note ?? "").toString().trim();

    if (!name || !email || !rawSlug) {
      return NextResponse.json(
        { error: "Missing name, email, or slug" },
        { status: 400 }
      );
    }

    const slug = toSlug(rawSlug);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    // If there is already a PendingInvite for this email, update it.
    // (Your schema has unique email and unique slug.)
    const existingForEmail = await prisma.pendingInvite.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // Make sure the slug isn’t already used by a DIFFERENT email’s invite
    const existingForSlug = await prisma.pendingInvite.findUnique({
      where: { slug },
      select: { id: true, email: true },
    });

    if (existingForSlug && existingForSlug.email !== email) {
      return NextResponse.json(
        { error: "That slug is already requested by another email." },
        { status: 409 }
      );
    }

    if (existingForEmail) {
      // Update existing invite for this email (reset to PENDING)
      await prisma.pendingInvite.update({
        where: { email },
        data: {
          name,
          slug,
          note,                // store the “note to PI”
          status: "PENDING",
          requestedAt: new Date(),
          decidedAt: null,     // clear any previous decision
        },
      });
    } else {
      // Create a new invite
      await prisma.pendingInvite.create({
        data: {
          name,
          email,
          slug,
          note,                // store the “note to PI”
          status: "PENDING",
          requestedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
