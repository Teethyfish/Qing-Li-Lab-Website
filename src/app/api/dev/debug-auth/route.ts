// src/app/api/dev/debug-auth/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../../lib/prisma";

// same logic we use in NextAuth, but exposed here for debugging
async function getLatestTempPw(email: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ note: string }[]>`
    SELECT "note"
    FROM "PendingInvite"
    WHERE LOWER("email") = LOWER(${email})
      AND "note" ILIKE '%TEMP_PW:%'
    ORDER BY COALESCE("decidedAt","requestedAt") DESC
    LIMIT 1
  `;
  const note = rows?.[0]?.note ?? "";
  const m = note.match(/TEMP_PW:\s*([^\s|]+)/i);
  return m?.[1] ?? null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = String(url.searchParams.get("email") || "").trim();
    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });

    const latestTemp = email ? await getLatestTempPw(email) : null;

    return NextResponse.json({
      ok: true,
      emailQueried: email || null,
      latestTemp,
      token: {
        present: !!token,
        email: (token as any)?.email ?? null,
        needsPwReset: !!(token as any)?.needsPwReset,
        role: (token as any)?.role ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
