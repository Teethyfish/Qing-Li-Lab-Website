// src/app/api/debug-auth/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

/**
 * TEMP DEBUG ONLY
 * Usage:
 *   /api/debug-auth?email=hoilamz@hawaii.edu&password=PLAINTEXT
 * Returns what the server sees from Prisma and whether bcrypt.compare passes.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim();
    const password = searchParams.get("password") || "";

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Provide ?email= & ?password=" },
        { status: 400 }
      );
    }

    // Case-insensitive lookup (same as in NextAuth)
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, role: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({
        ok: false,
        foundUser: false,
        note: "No user with that email",
      });
    }

    const storedHash = user.passwordHash ?? "";
    const looksLikeHash = typeof storedHash === "string" && storedHash.startsWith("$2");
    let compareResult = false;

    if (looksLikeHash) {
      compareResult = await bcrypt.compare(password, storedHash);
    }

    return NextResponse.json({
      ok: true,
      foundUser: true,
      emailSearched: email,
      userEmail: user.email,
      role: user.role,
      hasPasswordHash: !!user.passwordHash,
      hashPrefix: storedHash.slice(0, 7),
      looksLikeHash,
      compareResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
