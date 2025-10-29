// src/app/members/profile/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/* ---------- tiny helpers shared with page-builder ---------- */
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

type ProfilePageCfg = {
  heading?: string;
  intro?: string;
  showEmail?: boolean;
};
/* ----------------------------------------------------------- */

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  // Load current user
  const me = await prisma.user.findUnique({
    where: { email },
    select: { email: true, name: true, about: true, slug: true },
  });
  if (!me) redirect("/");

  // Optional builder config
  const cfg =
    (await getConfig<ProfilePageCfg>("members.profile.page")) ?? {};

  /* ---- server action: save profile ---- */
  async function saveProfile(formData: FormData) {
    "use server";
    const session2 = await getServerSession(authOptions);
    const myEmail = session2?.user?.email?.toLowerCase();
    if (!myEmail) redirect("/login");

    const name = String(formData.get("name") || "").trim();
    const about = String(formData.get("about") || "").trim();

    await prisma.user.update({
      where: { email: myEmail },
      data: {
        name: name || null,
        about: about || null,
      },
    });

    revalidatePath("/members/profile");
  }

  /* -------------------- UI -------------------- */
  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          {cfg.heading || "Edit your profile"}
        </h1>
        {cfg.showEmail !== false && (
          <p className="muted">{me.email}</p>
        )}
        {cfg.intro && (
          <p className="muted" style={{ marginTop: 6 }}>
            {cfg.intro}
          </p>
        )}
      </header>

      <section className="tile" style={{ padding: "1rem" }}>
        <form action={saveProfile} style={{ display: "grid", gap: "0.9rem" }}>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label style={{ fontWeight: 600 }}>Display name</label>
            <input
              name="name"
              defaultValue={me.name ?? ""}
              placeholder="Your name"
              style={{
                width: "100%",
                padding: "0.6rem 0.8rem",
                borderRadius: 10,
                border:
                  "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
                background: "var(--color-card)",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label style={{ fontWeight: 600 }}>About you</label>
            <textarea
              name="about"
              defaultValue={me.about ?? ""}
              rows={6}
              placeholder="A short bio or anything you'd like to share."
              style={{
                width: "100%",
                padding: "0.7rem 0.8rem",
                borderRadius: 10,
                border:
                  "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
                background: "var(--color-card)",
                resize: "vertical",
              }}
            />
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              This appears on your public profile page.
            </div>
          </div>

          <div>
            <button className="btn btn-accent" type="submit">
              Save changes
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
