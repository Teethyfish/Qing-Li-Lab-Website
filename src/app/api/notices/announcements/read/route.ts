import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const announcements = await prisma.announcement.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  if (announcements.length) {
    await prisma.announcementRead.createMany({
      data: announcements.map((announcement) => ({ userId: user.id, announcementId: announcement.id })),
      skipDuplicates: true,
    });
  }
  return NextResponse.json({ success: true });
}
