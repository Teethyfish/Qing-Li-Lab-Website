// src/app/members/profile/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
    select: { email: true, name: true, about: true },
  });

  const cfg = (await getConfig<ProfileCfg>("members.profile.page")) ?? {};

  // --- server action (no client JS needed) ---
  async function saveProfile(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const name = String(formData.get("name") || "").trim();
    const about = String(formData.get("about") || "").trim();

    if (!email) return;

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        name: name || null,
        about: about || null,
      },
    });

    revalidatePath("/members/profile");
  }

  // shared input style (prevents overflow)
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.7rem",
    borderRadius: 10,
    border: "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
    background: "var(--color-card)",
    boxSizing: "border-box",
  };

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          {cfg.heading || "Edit your profile"}
        </h1>
        {cfg.intro && <p className="muted">{cfg.intro}</p>}
      </header>

      <form action={saveProfile} className="grid gap-4" style={{ gridTemplateColumns: "1fr" }}>
        <input type="hidden" name="email" value={me?.email || ""} />

        {/* Name */}
        <div className="tile" style={{ padding: "1rem" }}>
          <label style={{ display: "grid", gap: "0.4rem" }}>
            <div style={{ fontWeight: 600 }}>Display name</div>
            <input
              name="name"
              defaultValue={me?.name ?? ""}
              placeholder="e.g. Lynn Zhang"
              style={inputStyle}
            />
          </label>
        </div>

        {/* About */}
        <div className="tile" style={{ padding: "1rem" }}>
          <label style={{ display: "grid", gap: "0.4rem" }}>
            <div style={{ fontWeight: 600 }}>About me</div>
            <textarea
              name="about"
              defaultValue={me?.about ?? ""}
              rows={6}
              placeholder="A short bio, research interests, etc."
              style={inputStyle}
            />
          </label>
        </div>

        <div>
          <button className="btn btn-accent" type="submit">Save changes</button>
        </div>
      </form>
    </main>
  );
}
