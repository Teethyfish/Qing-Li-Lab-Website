// src/app/members/profile/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, name: true, about: true },
  });

  // --- Server actions ---
  async function saveName(formData: FormData) {
    "use server";
    const newName = String(formData.get("name") || "").trim();
    await prisma.user.update({
      where: { email },
      data: { name: newName || null },
    });
    revalidatePath("/members/profile");
  }

  async function saveAbout(formData: FormData) {
    "use server";
    const newAbout = String(formData.get("about") || "").trim();
    await prisma.user.update({
      where: { email },
      data: { about: newAbout || null },
    });
    revalidatePath("/members/profile");
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          Edit your profile
        </h1>
        <p className="muted">
          <b>Email:</b> {user?.email}
        </p>
      </header>

      <section
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        {/* Display Name */}
        <form action={saveName} className="tile">
          <h3>Display name</h3>
          <p className="muted">Shown on the website and member directory.</p>
          <div style={{ marginTop: 10 }}>
            <input
              type="text"
              name="name"
              defaultValue={user?.name ?? ""}
              placeholder="e.g. Qing X. Li"
              style={{
                width: "100%",
                padding: "0.6rem 0.7rem",
                borderRadius: 10,
                border:
                  "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
                background: "var(--color-card)",
              }}
              required
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md"
              style={{
                background: "var(--color-accent)",
                color: "white",
                fontWeight: 600,
              }}
            >
              Save name
            </button>
          </div>
        </form>

        {/* About Me */}
        <form action={saveAbout} className="tile">
          <h3>About me</h3>
          <p className="muted">A short bio for your profile page.</p>
          <div style={{ marginTop: 10 }}>
            <textarea
              name="about"
              defaultValue={user?.about ?? ""}
              rows={6}
              placeholder="Write a short bio..."
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
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md"
              style={{
                background: "var(--color-accent)",
                color: "white",
                fontWeight: 600,
              }}
            >
              Save about
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
