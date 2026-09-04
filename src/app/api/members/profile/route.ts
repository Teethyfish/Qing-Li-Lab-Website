// src/app/api/members/profile/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

// Legacy self-profile endpoint retained for compatibility. It always derives
// the target user from the authenticated session and cannot edit other users.

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, user });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { email?: string; name?: string; about?: string }
      | null;

    const currentUser = await getCurrentUser();
    if (!currentUser?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name } : {}),
        ...(typeof body.about === "string" ? { about: body.about } : {}),
      },
      select: { email: true, name: true, about: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
