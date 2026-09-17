export const runtime = "nodejs";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/document-access";
import { localizedContent } from "@/lib/localized-content";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";

function noticeDate(date: Date, locale: string) {
  const dateLocale = locale === "zh" ? "zh-CN" : locale === "zh-Hant" ? "zh-TW" : locale === "ko" ? "ko-KR" : "en-US";
  return new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Honolulu",
  }).format(date);
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const t = await getTranslations("sitePages.notifications");
  const td = await getTranslations("sitePages.database");
  const locale = await getLocale();
  if (!user) redirect("/login");
  const [notifications, announcements] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { document: { select: { createdBy: { select: { name: true, email: true } } } } },
    }),
    prisma.announcement.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        text: true,
        createdAt: true,
        reads: { where: { userId: user.id }, select: { readAt: true }, take: 1 },
      },
    }),
  ]);
  const notices = [
    ...notifications.map((notification) => ({
      id: notification.id,
      kind: "notification" as const,
      title: notification.title,
      message: notification.message,
      uploaderName: notification.document ? notification.document.createdBy?.name?.trim() || notification.document.createdBy?.email || td("unknownUploader") : null,
      createdAt: notification.createdAt,
      unread: !notification.readAt,
    })),
    ...announcements.map((announcement) => ({
      id: announcement.id,
      kind: "announcement" as const,
      title: localizedContent(announcement.title, locale),
      message: localizedContent(announcement.text, locale),
      uploaderName: null,
      createdAt: announcement.createdAt,
      unread: announcement.reads.length === 0 && announcement.createdAt >= user.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  async function markAllRead() {
    "use server";
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/login");
    const activeAnnouncements = await prisma.announcement.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    await prisma.$transaction(async (database) => {
      await database.notification.updateMany({
        where: { userId: currentUser.id, readAt: null },
        data: { readAt: new Date() },
      });
      if (activeAnnouncements.length) {
        await database.announcementRead.createMany({
          data: activeAnnouncements.map((announcement) => ({
            userId: currentUser.id,
            announcementId: announcement.id,
          })),
          skipDuplicates: true,
        });
      }
    });
    revalidatePath("/members/notifications");
    revalidatePath("/", "layout");
  }

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "end" }}>
        <div>
          <h1>{t("title")}</h1>
          <p className="muted">{t("subtitle")}</p>
        </div>
        {notices.some((notice) => notice.unread) ? (
          <form action={markAllRead}><button className="btn btn-muted">{t("markAllRead")}</button></form>
        ) : null}
      </header>

      <section style={{ display: "grid", gap: "1rem" }}>
        {notices.length === 0 ? <p className="muted">{t("empty")}</p> : null}
        {notices.map((notice) => (
          <article
            key={`${notice.kind}-${notice.id}`}
            className="tile"
            style={{ borderLeft: notice.unread ? "4px solid var(--color-text)" : undefined }}
          >
            <p className="notice-kind" style={{ marginTop: 0 }}>{notice.kind === "announcement" ? t("announcement") : t("notification")}</p>
            <h2>{notice.title}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{notice.message}</p>
            {notice.uploaderName !== null ? <p className="muted">{td("uploadedBy")}: {notice.uploaderName}</p> : null}
            <p className="muted">{noticeDate(notice.createdAt, locale)}</p>
            <Link className="btn btn-basic" href={`/api/notices/open?kind=${notice.kind}&id=${encodeURIComponent(notice.id)}`}>{t("open")}</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
