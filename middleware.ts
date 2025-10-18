// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Read JWT from cookies (works on Edge)
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const needsPwReset = Boolean((token as any)?.needsPwReset);

  // If the user must reset password, force them to the reset page
  if (token && needsPwReset && !pathname.startsWith("/reset-password")) {
    const url = req.nextUrl.clone();
    url.pathname = "/reset-password";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Run on all routes except static files (let the early return above handle finer filters)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
