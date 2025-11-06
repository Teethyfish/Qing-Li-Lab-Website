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

  // Fetch active and archived announcements separately
  const activeAnnouncements = await prisma.announcement.findMany({
    where: { status: "ACTIVE" },
    orderBy: { order: "asc" },
  });

  const archivedAnnouncements = await prisma.announcement.findMany({
    where: { status: "ARCHIVED" },
    orderBy: { updatedAt: "desc" },
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
    const title = String(formData.get("title") || "").trim();
    const text = String(formData.get("text") || "").trim();
    const croppedArea = formData.get("croppedArea") as string | null;
    const order = parseInt(String(formData.get("order") || "0"), 10);
    const hasDetailsPage = formData.get("hasDetailsPage") === "true";
    const detailsSlug = hasDetailsPage ? String(formData.get("detailsSlug") || "").trim() : null;
    const detailsContent = hasDetailsPage ? String(formData.get("detailsContent") || "").trim() : null;

    if (!imageBase64 || !title || !text) return;
    if (hasDetailsPage && !detailsSlug) return;

    await prisma.announcement.create({
      data: {
        imageUrl: imageBase64,
        title,
        text,
        croppedArea,
        order,
        status: "ACTIVE",
        hasDetailsPage,
        detailsSlug,
        detailsContent,
      },
    });

    revalidatePath("/members/announcements");
    revalidatePath("/");
    if (detailsSlug) {
      revalidatePath(`/announcements/${detailsSlug}`);
    }
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
    const title = String(formData.get("title") || "").trim();
    const text = String(formData.get("text") || "").trim();
    const croppedArea = formData.get("croppedArea") as string | null;
    const order = parseInt(String(formData.get("order") || "0"), 10);
    const hasDetailsPage = formData.get("hasDetailsPage") === "true";
    const detailsSlug = hasDetailsPage ? String(formData.get("detailsSlug") || "").trim() : null;
    const detailsContent = hasDetailsPage ? String(formData.get("detailsContent") || "").trim() : null;

    if (!id || !title || !text) return;
    if (hasDetailsPage && !detailsSlug) return;

    const data: any = { title, text, order, croppedArea, hasDetailsPage, detailsSlug, detailsContent };
    if (imageBase64) {
      data.imageUrl = imageBase64;
    }

    await prisma.announcement.update({
      where: { id },
      data,
    });

    revalidatePath("/members/announcements");
    revalidatePath("/");
    if (detailsSlug) {
      revalidatePath(`/announcements/${detailsSlug}`);
    }
  }

  async function archiveAnnouncement(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role ?? null;
    if (typeof role !== "string" || role.toUpperCase() !== "ADMIN") {
      return;
    }

    const id = String(formData.get("id") || "");
    if (!id) return;

    await prisma.announcement.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    revalidatePath("/members/announcements");
    revalidatePath("/");
  }

  async function unarchiveAnnouncement(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role ?? null;
    if (typeof role !== "string" || role.toUpperCase() !== "ADMIN") {
      return;
    }

    const id = String(formData.get("id") || "");
    if (!id) return;

    await prisma.announcement.update({
      where: { id },
      data: { status: "ACTIVE" },
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

    // Get the announcement to check if it has a details page
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      select: { detailsSlug: true },
    });

    await prisma.announcement.delete({
      where: { id },
    });

    revalidatePath("/members/announcements");
    revalidatePath("/");
    if (announcement?.detailsSlug) {
      revalidatePath(`/announcements/${announcement.detailsSlug}`);
    }
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
        activeAnnouncements={activeAnnouncements}
        archivedAnnouncements={archivedAnnouncements}
        createAnnouncement={createAnnouncement}
        updateAnnouncement={updateAnnouncement}
        archiveAnnouncement={archiveAnnouncement}
        unarchiveAnnouncement={unarchiveAnnouncement}
        deleteAnnouncement={deleteAnnouncement}
      />
    </main>
  );
}
