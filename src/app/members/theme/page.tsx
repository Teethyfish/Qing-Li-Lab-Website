// src/app/members/theme/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * We store the theme in AppConfig as JSON under key "theme".
 * The JSON is a flat map of CSS variable name -> value.
 * Example:
 * {
 *   "--color-bg": "#ffffff",
 *   "--btn-radius": "10px",
 *   ...
 * }
 */

type KV = Record<string, string>;
type Row = { value: string };

async function readTheme(): Promise<KV> {
  try {
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT value FROM "AppConfig" WHERE key = 'theme' LIMIT 1`
    );
    if (!rows?.[0]?.value) return {};
    const parsed = JSON.parse(rows[0].value) as KV;
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

const DEFAULTS: KV = {
  // site colors
  "--color-bg": "#ffffff",
  "--color-text": "#111827",
  "--color-muted": "#6b7280",
  "--color-accent": "#2563eb",
  "--color-card": "#ffffff",

  // === Buttons ===
  // shape
  "--btn-radius": "10px",
  "--btn-py": "0.55rem",
  "--btn-px": "0.9rem",
  "--btn-weight": "600",

  // primary
  "--btn-primary-bg": "oklab(0.35 0 0)", // fallback: dark mix of text; can be overridden
  "--btn-primary-fg": "#ffffff",
  "--btn-primary-hover-bg": "oklab(0.30 0 0)",

  // accent
  "--btn-accent-bg": "#2563eb",
  "--btn-accent-fg": "#ffffff",
  "--btn-accent-hover-bg": "#1e4fd1",

  // muted
  "--btn-muted-bg": "#f5f5f5",
  "--btn-muted-fg": "#111827",
  "--btn-muted-hover-bg": "#ededed",
  "--btn-muted-border": "1px solid #e5e7eb",
};

// Field config for rendering the form
type Field =
  | { var: string; label: string; type: "color"; help?: string }
  | { var: string; label: string; type: "text"; help?: string; placeholder?: string }
  | { var: string; label: string; type: "number"; help?: string; step?: string; min?: string };

const COLOR_FIELDS: Field[] = [
  { var: "--color-bg", label: "Background", type: "color" },
  { var: "--color-text", label: "Text", type: "color" },
  { var: "--color-muted", label: "Muted Text", type: "color" },
  { var: "--color-accent", label: "Accent", type: "color" },
  { var: "--color-card", label: "Card Background", type: "color" },
];

const SHAPE_FIELDS: Field[] = [
  { var: "--btn-radius", label: "Button Radius", type: "text", help: "e.g. 10px" },
  { var: "--btn-py", label: "Button Padding Y", type: "text", help: "e.g. 0.55rem" },
  { var: "--btn-px", label: "Button Padding X", type: "text", help: "e.g. 0.9rem" },
  { var: "--btn-weight", label: "Button Font Weight", type: "text", help: "e.g. 600" },
];

const PRIMARY_FIELDS: Field[] = [
  { var: "--btn-primary-bg", label: "Primary BG", type: "text", help: "CSS color (e.g. #111827)" },
  { var: "--btn-primary-fg", label: "Primary FG", type: "color" },
  { var: "--btn-primary-hover-bg", label: "Primary Hover BG", type: "text", help: "CSS color" },
];

const ACCENT_FIELDS: Field[] = [
  { var: "--btn-accent-bg", label: "Accent BG", type: "color" },
  { var: "--btn-accent-fg", label: "Accent FG", type: "color" },
  { var: "--btn-accent-hover-bg", label: "Accent Hover BG", type: "color" },
];

const MUTED_FIELDS: Field[] = [
  { var: "--btn-muted-bg", label: "Muted BG", type: "color" },
  { var: "--btn-muted-fg", label: "Muted FG", type: "color" },
  { var: "--btn-muted-hover-bg", label: "Muted Hover BG", type: "color" },
  { var: "--btn-muted-border", label: "Muted Border", type: "text", help: `e.g. "1px solid #e5e7eb"` },
];

export default async function ThemeEditorPage() {
  // Admin-only
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role && role.toUpperCase() === "ADMIN";
  if (!isAdmin) redirect("/");

  // Load existing theme and merge defaults
  const current = await readTheme();
  const theme: KV = { ...DEFAULTS, ...current };

  // --- Server action to save ---
  async function saveTheme(formData: FormData) {
    "use server";
    const incoming: KV = {};
    // Collect all fields we render
    const all = [
      ...COLOR_FIELDS,
      ...SHAPE_FIELDS,
      ...PRIMARY_FIELDS,
      ...ACCENT_FIELDS,
      ...MUTED_FIELDS,
    ];
    for (const f of all) {
      const raw = (formData.get(f.var) ?? "").toString().trim();
      if (raw) incoming[f.var] = raw;
    }

    // Keep any unknown/existing keys so upgrades don't nuke them
    const existing = await readTheme();
    const merged: KV = { ...existing, ...incoming };

    // Upsert AppConfig
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AppConfig" (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      "theme",
      JSON.stringify(merged)
    );

    // Revalidate so the layout picks up updated CSS vars
    revalidatePath("/", "layout");
    revalidatePath("/members/theme");
  }

  // Simple labeled control
  const FieldRow = (f: Field) => {
    const base: React.CSSProperties = { display: "grid", gap: "0.4rem" };
    const inputBase: React.CSSProperties = {
      width: "100%",
      padding: "0.55rem 0.7rem",
      borderRadius: 10,
      border:
        "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
      background: "var(--color-card)",
    };
    return (
      <label className="tile" style={{ ...base, padding: "0.9rem" }}>
        <div>
          <div style={{ fontWeight: 600 }}>{f.label}</div>
          {f.help && (
            <div className="muted" style={{ fontSize: "0.85rem", marginTop: 2 }}>
              {f.help}
            </div>
          )}
        </div>
        {f.type === "color" ? (
          <input type="color" name={f.var} defaultValue={theme[f.var] ?? "#000000"} />
        ) : (
          <input
            type="text"
            name={f.var}
            defaultValue={theme[f.var] ?? ""}
            placeholder={(f as any).placeholder ?? ""}
            style={inputBase}
          />
        )}
      </label>
    );
  };

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          Theme Editor
        </h1>
        <p className="muted">
          Tweak global colors and button styles. Changes apply site-wide.
        </p>
      </header>

      <form action={saveTheme} className="space-y-6">
        {/* Colors */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Site colors</h2>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
          >
            {COLOR_FIELDS.map((f) => (
              <FieldRow key={f.var} {...f} />
            ))}
          </div>
        </section>

        {/* Buttons: Shape */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Buttons — shape</h2>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
          >
            {SHAPE_FIELDS.map((f) => (
              <FieldRow key={f.var} {...f} />
            ))}
          </div>
        </section>

        {/* Buttons: Colors */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Buttons — colors</h2>

          <div className="tile" style={{ padding: "1rem" }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: "0.9rem" }}>
              Preview
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <a className="btn btn-primary" href="#" onClick={(e) => e.preventDefault()}>
                Primary
              </a>
              <a className="btn btn-accent" href="#" onClick={(e) => e.preventDefault()}>
                Accent
              </a>
              <a className="btn btn-muted" href="#" onClick={(e) => e.preventDefault()}>
                Muted
              </a>
              <button className="btn btn-primary sm" type="button">
                Small
              </button>
              <button className="btn btn-accent lg" type="button">
                Large
              </button>
              <button className="btn btn-muted icon" type="button" aria-label="icon">
                •
              </button>
            </div>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
          >
            {PRIMARY_FIELDS.map((f) => (
              <FieldRow key={f.var} {...f} />
            ))}
            {ACCENT_FIELDS.map((f) => (
              <FieldRow key={f.var} {...f} />
            ))}
            {MUTED_FIELDS.map((f) => (
              <FieldRow key={f.var} {...f} />
            ))}
          </div>
        </section>

        <div>
          <button className="btn btn-accent">Save theme</button>
        </div>
      </form>
    </main>
  );
}
