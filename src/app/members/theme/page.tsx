export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTheme, saveTheme, type Theme } from "@/lib/theme";
import { revalidatePath } from "next/cache";

// --- server action: save theme ---
async function saveAction(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  const me = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (me?.role !== "ADMIN") redirect("/");

  const theme: Theme = {
    colors: {
      bg: String(formData.get("colors.bg") || "#ffffff"),
      text: String(formData.get("colors.text") || "#111827"),
      muted: String(formData.get("colors.muted") || "#6b7280"),
      primary: String(formData.get("colors.primary") || "#2563eb"),
      accent: String(formData.get("colors.accent") || "#059669"),
    },
    font: {
      family: String(formData.get("font.family") || "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"),
      size: String(formData.get("font.size") || "16px"),
    },
    radius: {
      sm: String(formData.get("radius.sm") || "0.25rem"),
      md: String(formData.get("radius.md") || "0.5rem"),
      lg: String(formData.get("radius.lg") || "0.75rem"),
    },
  };

  await saveTheme(theme);
  // refresh layout and this page so new CSS vars apply immediately
  revalidatePath("/");
  revalidatePath("/members/theme");
}

export default async function ThemePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  const me = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (me?.role !== "ADMIN") redirect("/");

  const t = await getTheme();

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Theme Editor</h1>
        <p className="text-gray-600">Admin only. Adjust site-wide colors, fonts, and border radius.</p>
      </header>

      <form action={saveAction} className="grid gap-6">
        {/* Colors */}
        <section className="rounded border p-4">
          <h2 className="mb-3 text-lg font-semibold">Colors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ["colors.bg", "Background", t.colors.bg],
              ["colors.text", "Text", t.colors.text],
              ["colors.muted", "Muted", t.colors.muted],
              ["colors.primary", "Primary", t.colors.primary],
              ["colors.accent", "Accent", t.colors.accent],
            ] as const).map(([name, label, val]) => (
              <label key={name} className="grid gap-1.5">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    defaultValue={val}
                    onChange={(e) => {
                      const text = (e.currentTarget.nextElementSibling as HTMLInputElement);
                      if (text) text.value = e.currentTarget.value;
                    }}
                  />
                  <input
                    name={name}
                    defaultValue={val}
                    className="w-full rounded border p-2 font-mono text-sm"
                    placeholder="#2563eb"
                  />
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="rounded border p-4">
          <h2 className="mb-3 text-lg font-semibold">Typography</h2>
          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm">Font Family</span>
              <input
                name="font.family"
                defaultValue={t.font.family}
                className="w-full rounded border p-2 font-mono text-sm"
                placeholder='system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm">Base Font Size</span>
              <input
                name="font.size"
                defaultValue={t.font.size}
                className="w-full rounded border p-2 font-mono text-sm"
                placeholder="16px"
              />
            </label>
          </div>
        </section>

        {/* Radius */}
        <section className="rounded border p-4">
          <h2 className="mb-3 text-lg font-semibold">Border Radius</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              ["radius.sm", "Small", t.radius.sm],
              ["radius.md", "Medium", t.radius.md],
              ["radius.lg", "Large", t.radius.lg],
            ] as const).map(([name, label, val]) => (
              <label key={name} className="grid gap-1.5">
                <span className="text-sm">{label}</span>
                <input
                  name={name}
                  defaultValue={val}
                  className="w-full rounded border p-2 font-mono text-sm"
                  placeholder="0.5rem"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Quick Preview */}
        <section className="rounded border p-4">
          <h2 className="mb-3 text-lg font-semibold">Preview</h2>
          <p className="text-gray-600 text-sm mb-2">These samples use the theme variables:</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="rounded border px-3 py-2">Neutral button</button>
            <button type="button" className="rounded px-3 py-2" style={{ background: "var(--color-primary)", color: "#fff" }}>
              Primary button
            </button>
            <div className="rounded border p-3" style={{ borderRadius: "var(--radius-lg)" }}>Card example</div>
            <a className="underline" href="#">Link example</a>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button className="rounded px-4 py-2 text-white" style={{ background: "var(--color-primary)" }} type="submit">
            Save Theme
          </button>
          <a className="rounded border px-4 py-2" href="/">Back to Home</a>
        </div>
      </form>
    </main>
  );
}
