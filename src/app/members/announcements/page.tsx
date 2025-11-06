// src/app/members/announcements/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import AnnouncementsManager from "./AnnouncementsManager";

export default async function AnnouncementsPage() {
  const t = await getTranslations('announcements');
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  const role = (session?.user as any)?.role ?? null;

  // Only admins can access
  if (!email || typeof role !== "string" || role.toUpperCase() !== "ADMIN") {
    redirect("/");
  }

  // Fetch all announcements
  const announcements = await prisma.announcement.findMany({
    orderBy: { order: "asc" },
  });

  // --- Server Actions ---
  async function createAnnouncement(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role ?? null;
    if (typeof role !== "string" || role.toUpperCase() !== "ADMIN") {
      return;
    }

    const imageBase64 = formData.get("imageBase64") as string;
    const text = String(formData.get("text") || "").trim();
    const croppedArea = formData.get("croppedArea") as string | null;
    const order = parseInt(String(formData.get("order") || "0"), 10);

    if (!imageBase64 || !text) return;

    await prisma.announcement.create({
      data: {
        imageUrl: imageBase64,
        text,
        croppedArea,
        order,
        isActive: true,
      },
    });

    revalidatePath("/members/announcements");
    revalidatePath("/");
  }

  async function updateAnnouncement(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role ?? null;
    if (typeof role !== "string" || role.toUpperCase() !== "ADMIN") {
      return;
    }

    const id = String(formData.get("id") || "");
    const imageBase64 = formData.get("imageBase64") as string | null;
    const text = String(formData.get("text") || "").trim();
    const croppedArea = formData.get("croppedArea") as string | null;
    const isActive = formData.get("isActive") === "true";
    const order = parseInt(String(formData.get("order") || "0"), 10);

    if (!id || !text) return;

    const data: any = { text, isActive, order, croppedArea };
    if (imageBase64) {
      data.imageUrl = imageBase64;
    }

    await prisma.announcement.update({
      where: { id },
      data,
    });

    revalidatePath("/members/announcements");
    revalidatePath("/");
  }

  async function deleteAnnouncement(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role ?? null;
    if (typeof role !== "string" || role.toUpperCase() !== "ADMIN") {
      return;
    }

    const id = String(formData.get("id") || "");
    if (!id) return;

    await prisma.announcement.delete({
      where: { id },
    });

    revalidatePath("/members/announcements");
    revalidatePath("/");
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        {t('heading')}
      </h1>
      <p className="muted" style={{ marginBottom: "2rem" }}>
        {t('subtitle')}
      </p>

      <AnnouncementsManager
        announcements={announcements}
        createAnnouncement={createAnnouncement}
        updateAnnouncement={updateAnnouncement}
        deleteAnnouncement={deleteAnnouncement}
      />
    </main>
  );
}
