import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { locales } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { getThemeCatalog } from "@/lib/theme";

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as { locale?: unknown; themePreference?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const locale = typeof body.locale === "string" && locales.includes(body.locale as (typeof locales)[number]) ? body.locale : undefined;
  const themeIds = new Set((await getThemeCatalog()).map((theme) => theme.id));
  const themePreference = typeof body.themePreference === "string" && themeIds.has(body.themePreference) ? body.themePreference : undefined;
  if (!locale && !themePreference) return NextResponse.json({ error: "No valid preference supplied." }, { status: 400 });

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (email) {
    await prisma.user.update({
      where: { email },
      data: { ...(locale ? { locale } : {}), ...(themePreference ? { themePreference } : {}) },
    });
  }

  const response = NextResponse.json({ ok: true });
  if (locale) response.cookies.set("site-locale", locale, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  if (themePreference) response.cookies.set("site-theme", themePreference, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  return response;
}
