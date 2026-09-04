import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  exchangeGoogleCode,
  getGoogleAccountEmail,
  saveGoogleConnection,
} from "@/lib/google";

export async function GET(request: NextRequest) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
  const destination = new URL("/members/documents", siteUrl);
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role?.toUpperCase() !== "ADMIN") {
    return NextResponse.redirect(new URL("/", siteUrl));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("google_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    destination.searchParams.set("google", "invalid-state");
    return NextResponse.redirect(destination);
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.refresh_token) throw new Error("Google did not return an offline refresh token.");

    const email = await getGoogleAccountEmail(tokens.access_token!);
    const expectedEmail = (process.env.GOOGLE_ACCOUNT_EMAIL || "qinglilab@gmail.com").toLowerCase();
    if (email !== expectedEmail) {
      throw new Error(`Connect ${expectedEmail}, not ${email}.`);
    }

    await saveGoogleConnection(email, tokens.refresh_token);
    destination.searchParams.set("google", "connected");
  } catch (error) {
    destination.searchParams.set(
      "google",
      error instanceof Error ? error.message.slice(0, 160) : "connection-failed"
    );
  }

  const response = NextResponse.redirect(destination);
  response.cookies.delete("google_oauth_state");
  return response;
}
