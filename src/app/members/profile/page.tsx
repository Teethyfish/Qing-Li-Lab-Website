// src/app/members/profile/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import ProfileForm from "./ProfileForm";

/* optional: page-builder text */
type AppRow = { value: string };
async function getConfig<T = unknown>(key: string): Promise<T | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<AppRow[]>(
      `select value from "AppConfig" where key = $1 limit 1`,
      key
    );
    if (!rows?.[0]?.value) return null;
    return JSON.parse(rows[0].value) as T;
  } catch {
    return null;
  }
}
type ProfileCfg = { heading?: string; intro?: string };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { email },
    select: { email: true, name: true, about: true, imageUrl: true },
  });

  if (!me) redirect("/login");

  const cfg = (await getConfig<ProfileCfg>("members.profile.page")) ?? {};

  // --- server action ---
  async function saveProfile(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const name = String(formData.get("name") || "").trim();
    const about = String(formData.get("about") || "").trim();
    const imageBase64 = formData.get("imageBase64") as string | null;

    if (!email) return;

    // Build update data object
    const updateData: any = {
      name: name || null,
      about: about || null,
    };

    // Only update imageUrl if a new image was provided (already cropped and base64)
    if (imageBase64) {
      updateData.imageUrl = imageBase64;
    }

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: updateData,
    });

    revalidatePath("/members/profile");
    revalidatePath("/");
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          {cfg.heading || "Edit your profile"}
        </h1>
        {cfg.intro && <p className="muted">{cfg.intro}</p>}
      </header>

      <ProfileForm user={me} saveProfile={saveProfile} />
    </main>
  );
}
