// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "../components/NavBar";
import TranslationsProvider from "../components/TranslationsProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTheme, themeToCss } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { defaultLocale } from "@/i18n/config";

export const viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "Qing Li Lab — Internal",
  description: "Lab website",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get session to derive navbar props
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const role = (session?.user as any)?.role ?? null;
  const isAuthed = !!email;
  const isAdmin = typeof role === "string" && role.toUpperCase() === "ADMIN";

  // Get user's locale, slug, and imageUrl for profile link and navbar
  let userSlug: string | null = null;
  let userImageUrl: string | null = null;
  let userName: string | null = null;
  let userLocale: string = defaultLocale;

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { slug: true, imageUrl: true, name: true, locale: true },
    });
    userSlug = user?.slug ?? null;
    userImageUrl = user?.imageUrl ?? null;
    userName = user?.name ?? null;
    userLocale = user?.locale ?? defaultLocale;
  }

  // Load translation messages for the user's locale
  const messages = (await import(`@/i18n/messages/${userLocale}.json`)).default;

  // Load theme from DB and inject as CSS variables
  const theme = await getTheme();
  const cssVars = themeToCss(theme);

  return (
    <html lang={userLocale}>
      <body
        className="min-h-screen antialiased"
        style={{
          background: "var(--color-bg)",
          color: "var(--color-text)",
          fontFamily: "var(--font-family)",
          fontSize: "var(--font-size)",
          margin: 0,
          padding: 0,
          overflowX: "hidden",
        }}
      >
        {/* Inject CSS variables for the whole site */}
        <style id="theme">{cssVars}</style>

        <TranslationsProvider locale={userLocale} messages={messages}>
          {/* Global nav expects props */}
          <NavBar
            isAuthed={isAuthed}
            isAdmin={isAdmin}
            userSlug={userSlug}
            userImageUrl={userImageUrl}
            userName={userName}
          />

          {/* Page content */}
          <div className="mx-auto max-w-5xl p-6" style={{ position: "relative", zIndex: 1 }}>{children}</div>
        </TranslationsProvider>
      </body>
    </html>
  );
}
