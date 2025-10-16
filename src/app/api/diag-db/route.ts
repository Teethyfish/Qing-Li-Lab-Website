// src/app/api/diag-db/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

function redact(url: string) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "<invalid URL>";
  }
}

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "";
  const directUrl = process.env.DIRECT_URL || "";
  try {
    // A super simple round-trip query.
    // If you're really on the POOLER URL with pgbouncer=true, this should work fine.
    const one = await prisma.$queryRaw`select 1 as n`;
    return NextResponse.json({
      ok: true,
      usingDatabaseUrl: redact(dbUrl),
      usingDirectUrl: redact(directUrl),
      queryResult: one,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        usingDatabaseUrl: redact(dbUrl),
        usingDirectUrl: redact(directUrl),
        error: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
