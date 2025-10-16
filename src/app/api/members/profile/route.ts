// src/app/api/members/profile/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Quick sanity check endpoint:
 * - GET returns ok:true so we can verify the route exists
 * - POST saves name/about for the current user (auth check comes next)
 */

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/members/profile" });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { email?: string; name?: string; about?: string }
      | null;

    if (!body || !body.email) {
      return NextResponse.json(
        { error: "Missing email in body (temporary check)" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { email: body.email.toLowerCase() },
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
