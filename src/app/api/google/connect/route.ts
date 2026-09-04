import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createGoogleAuthorizationUrl } from "@/lib/google";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role?.toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const state = crypto.randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(createGoogleAuthorizationUrl(state));
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth is not configured.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
