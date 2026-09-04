import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const needsPasswordReset = Boolean(token?.needsPwReset);
  const isResetFlow =
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/user/reset-password");

  if (token && needsPasswordReset && !isResetFlow) {
    const url = req.nextUrl.clone();
    url.pathname = "/reset-password";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
