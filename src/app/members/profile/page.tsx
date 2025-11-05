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
    select: { email: true, name: true, about: true, imageUrl: true },
  });

  const cfg = (await getConfig<ProfileCfg>("members.profile.page")) ?? {};

  // --- server action (no client JS needed) ---
  async function saveProfile(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const name = String(formData.get("name") || "").trim();
    const about = String(formData.get("about") || "").trim();
    const imageFile = formData.get("image") as File | null;

    if (!email) return;

    // Convert image to base64 if provided
    let imageUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      imageUrl = `data:${imageFile.type};base64,${base64}`;
    }

    // Build update data object
    const updateData: any = {
      name: name || null,
      about: about || null,
    };

    // Only update imageUrl if a new image was uploaded
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: updateData,
    });

    revalidatePath("/members/profile");
    revalidatePath("/");
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

        {/* Profile Picture */}
        <div className="tile" style={{ padding: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Profile picture</div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "9999px",
                overflow: "hidden",
                border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "color-mix(in oklab, var(--color-text) 6%, #f3f4f6)",
                color: "var(--color-text)",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {me?.imageUrl ? (
                <img
                  src={me.imageUrl}
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "1.5rem" }}>
                  {me?.name
                    ? me.name
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase() ?? "")
                        .join("") || "??"
                    : "??"}
                </span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="file"
                name="image"
                accept="image/*"
                style={inputStyle}
              />
              <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>
                Upload a new profile picture (JPG, PNG, etc.)
              </div>
            </div>
          </div>
        </div>

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
          <button className="btn btn-basic" type="submit">Save changes</button>
        </div>
      </form>
    </main>
  );
}
