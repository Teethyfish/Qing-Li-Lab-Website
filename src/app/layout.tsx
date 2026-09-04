// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "../components/NavBar";
import TranslationsProvider from "../components/TranslationsProvider";
import { EditModeProvider } from "@/contexts/EditModeContext";
import EditModeSaveBar from "../components/EditModeSaveBar";
import GlobalContentEditor from "../components/GlobalContentEditor";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { getTheme, themeToCss } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { defaultLocale, locales } from "@/i18n/config";
import { publicMediaUrl } from "@/lib/media-url";

export const viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "Qing Li Lab — Internal",
  description: "Lab website",
};

function localizedNoticeText(value: string, locale: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const localized = parsed[locale] ?? parsed.en ?? Object.values(parsed)[0];
    return typeof localized === "string" ? localized : value;
  } catch { return value; }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get session to derive navbar props
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const role = (session?.user as any)?.role ?? null;
  const isAuthed = !!email;
  const isAdmin = typeof role === "string" && role.toUpperCase() === "ADMIN";

  // Get user's locale, slug, and imageUrl for profile link and navbar
  let userSlug: string | null = null;
  let userId: string | null = null;
  let userImageUrl: string | null = null;
  let userName: string | null = null;
  let userCreatedAt: Date | null = null;
  let userLocale: string = defaultLocale;
  let userThemePreference = "light";
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("site-locale")?.value;
  const cookieTheme = cookieStore.get("site-theme")?.value;
  if (cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])) userLocale = cookieLocale;
  if (cookieTheme) userThemePreference = cookieTheme;

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, slug: true, imageUrl: true, name: true, locale: true, themePreference: true, createdAt: true, updatedAt: true },
    });
    userId = user?.id ?? null;
    userSlug = user?.slug ?? null;
    userImageUrl = user?.imageUrl && user.id ? publicMediaUrl("user", user.id, "image", user.updatedAt) : null;
    userName = user?.name ?? null;
    userCreatedAt = user?.createdAt ?? null;
    userLocale = user?.locale ?? defaultLocale;
    userThemePreference = user?.themePreference ?? "light";
  }

  const unreadNotificationCount = userId
    ? await prisma.notification.count({ where: { userId, readAt: null } })
    : 0;

  const [personalNotices, announcementNotices, unreadAnnouncementCount] = userId
    ? await Promise.all([
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, title: true, message: true, readAt: true, createdAt: true },
        }),
        prisma.announcement.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            title: true,
            text: true,
            createdAt: true,
            reads: { where: { userId }, select: { readAt: true }, take: 1 },
          },
        }),
        prisma.announcement.count({
          where: {
            status: "ACTIVE",
            ...(userCreatedAt ? { createdAt: { gte: userCreatedAt } } : {}),
            reads: { none: { userId } },
          },
        }),
      ])
    : [[], [], 0] as const;
  const recentNotices = [
    ...personalNotices.map((notice) => ({
      id: notice.id,
      kind: "notification" as const,
      title: notice.title,
      message: notice.message,
      unread: !notice.readAt,
      createdAt: notice.createdAt.toISOString(),
    })),
    ...announcementNotices.map((notice) => ({
      id: notice.id,
      kind: "announcement" as const,
      title: localizedNoticeText(notice.title, userLocale),
      message: localizedNoticeText(notice.text, userLocale),
      unread: notice.reads.length === 0 && (!userCreatedAt || notice.createdAt >= userCreatedAt),
      createdAt: notice.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  // Load translation messages for the user's locale
  const messages = (await import(`@/i18n/messages/${userLocale}.json`)).default;

  // Load theme from DB and inject as CSS variables
  const theme = await getTheme(userThemePreference);
  const cssVars = themeToCss(theme);

  const editableRows = await prisma.appConfig.findMany({
    where: { key: { startsWith: "content:" } },
    select: { key: true, value: true },
  });
  const editableContent: Record<string, { value: string; format: "text" | "html" }> = {};
  for (const { key, value } of editableRows) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "string") editableContent[key] = { value: parsed, format: "text" };
      else if (
        parsed &&
        typeof parsed === "object" &&
        "format" in parsed &&
        "value" in parsed &&
        parsed.format === "html" &&
        typeof parsed.value === "string"
      ) editableContent[key] = { value: parsed.value, format: "html" };
    } catch {
      // Ignore malformed legacy content rows.
    }
  }

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
          <EditModeProvider>
            {/* Global nav expects props */}
            <NavBar
              isAuthed={isAuthed}
              isAdmin={isAdmin}
              canEdit={isAdmin}
              userSlug={userSlug}
              userImageUrl={userImageUrl}
              userName={userName}
              unreadNotificationCount={unreadNotificationCount}
              hasUnreadAnnouncements={unreadAnnouncementCount > 0}
              recentNotices={recentNotices}
              currentLocale={userLocale}
              currentThemeId={userThemePreference}
            />

            {/* Page content */}
            <GlobalContentEditor canEdit={isAdmin} initialContent={editableContent}>
              <div className="site-content-surface">
                <div className="site-content-inner">{children}</div>
              </div>
            </GlobalContentEditor>

            {/* Edit mode save bar */}
            <EditModeSaveBar />
          </EditModeProvider>
        </TranslationsProvider>
      </body>
    </html>
  );
}
