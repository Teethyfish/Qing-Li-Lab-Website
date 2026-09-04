import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.redirect(new URL("/login", request.url));
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const id = params.get("id") || "";
  let href = "/members/notifications";

  if (kind === "notification") {
    const notification = await prisma.notification.findFirst({ where: { id, userId: user.id } });
    if (notification) {
      await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
      href = notification.href.startsWith("/") ? notification.href : "/members/notifications";
    }
  } else if (kind === "announcement") {
    const announcement = await prisma.announcement.findFirst({ where: { id, status: "ACTIVE" } });
    if (announcement) {
      await prisma.announcementRead.upsert({
        where: { userId_announcementId: { userId: user.id, announcementId: announcement.id } },
        update: { readAt: new Date() },
        create: { userId: user.id, announcementId: announcement.id },
      });
      href = announcement.hasDetailsPage && announcement.detailsSlug
        ? `/announcements/${encodeURIComponent(announcement.detailsSlug)}`
        : "/";
    }
  }
  return NextResponse.redirect(new URL(href, request.url));
}
