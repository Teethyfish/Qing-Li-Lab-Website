// src/app/members/theme/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/** Theme is a flat map of CSS var -> value, stored in AppConfig under key "theme". */
type KV = Record<string, string>;
type Row = { value: string };

async function readTheme(): Promise<KV> {
  try {
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT value FROM "AppConfig" WHERE key = 'theme' LIMIT 1`
    );
    if (!rows?.[0]?.value) return {};
    const parsed = JSON.parse(rows[0].value) as KV;
    return parsed && typeof parsed === "object" ? parsed : {};
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

  // === Cards/Tiles ===
  "--tile-radius": "12px",
  "--tile-padding": "1rem",
  "--tile-border-opacity": "12%",
  "--tile-shadow-opacity": "8%",

  // === Buttons ===
  "--btn-radius": "10px",
  "--btn-py": "0.55rem",
  "--btn-px": "0.9rem",
  "--btn-weight": "600",

  // Basic (using primary settings)
  "--btn-basic-bg": "#111827",
  "--btn-basic-fg": "#ffffff",
  "--btn-basic-hover-bg": "#0a0f1a",
  "--btn-basic-border-color": "#111827",

  // Muted
  "--btn-muted-bg": "#f5f5f5",
  "--btn-muted-fg": "#111827",
  "--btn-muted-hover-bg": "#ededed",
  "--btn-muted-border-color": "#e5e7eb",

  // Warning
  "--btn-warning-bg": "#f59e0b",
  "--btn-warning-fg": "#ffffff",
  "--btn-warning-hover-bg": "#d97706",
  "--btn-warning-border-color": "#f59e0b",

  // === Navbar ===
  "--nav-bg": "color-mix(in oklab, #ffffff 90%, transparent)",
  "--nav-text": "#111827",
  "--nav-border": "#e5e7eb",
  "--nav-height": "56px",
  "--nav-blur": "6px",
};

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

const TILE_FIELDS: Field[] = [
  { var: "--tile-radius", label: "Tile Border Radius", type: "text", help: "e.g. 12px" },
  { var: "--tile-padding", label: "Tile Padding", type: "text", help: "e.g. 1rem" },
  { var: "--tile-border-opacity", label: "Tile Border Opacity", type: "text", help: "e.g. 12%" },
  { var: "--tile-shadow-opacity", label: "Tile Shadow Opacity", type: "text", help: "e.g. 8%" },
];

const SHAPE_FIELDS: Field[] = [
  { var: "--btn-radius", label: "Button Radius", type: "text", help: "e.g. 10px" },
  { var: "--btn-py", label: "Button Padding Y", type: "text", help: "e.g. 0.55rem" },
  { var: "--btn-px", label: "Button Padding X", type: "text", help: "e.g. 0.9rem" },
  { var: "--btn-weight", label: "Button Font Weight", type: "text", help: "e.g. 600" },
];

const BASIC_FIELDS: Field[] = [
  { var: "--btn-basic-bg", label: "Basic BG", type: "color" },
  { var: "--btn-basic-fg", label: "Basic FG", type: "color" },
  { var: "--btn-basic-hover-bg", label: "Basic Hover BG", type: "color" },
  { var: "--btn-basic-border-color", label: "Basic Border Color", type: "color" },
];

const MUTED_FIELDS: Field[] = [
  { var: "--btn-muted-bg", label: "Muted BG", type: "color" },
  { var: "--btn-muted-fg", label: "Muted FG", type: "color" },
  { var: "--btn-muted-hover-bg", label: "Muted Hover BG", type: "color" },
  { var: "--btn-muted-border-color", label: "Muted Border Color", type: "color" },
];

const WARNING_FIELDS: Field[] = [
  { var: "--btn-warning-bg", label: "Warning BG", type: "color" },
  { var: "--btn-warning-fg", label: "Warning FG", type: "color" },
  { var: "--btn-warning-hover-bg", label: "Warning Hover BG", type: "color" },
  { var: "--btn-warning-border-color", label: "Warning Border Color", type: "color" },
];

const NAVBAR_FIELDS: Field[] = [
  { var: "--nav-bg", label: "Navbar Background", type: "text", help: "e.g. #ffffff or color-mix(...)" },
  { var: "--nav-text", label: "Navbar Text", type: "color" },
  { var: "--nav-border", label: "Navbar Border", type: "color" },
  { var: "--nav-height", label: "Navbar Height", type: "text", help: "e.g. 56px" },
  { var: "--nav-blur", label: "Backdrop Blur", type: "text", help: "e.g. 6px" },
];

export default async function ThemeEditorPage() {
  // Admin-only
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role && role.toUpperCase() === "ADMIN";
  if (!isAdmin) redirect("/");

  // Merge defaults with saved values
  const current = await readTheme();
  const theme: KV = { ...DEFAULTS, ...current };

  // --- Server action to save ---
  async function saveTheme(formData: FormData) {
    "use server";
    const incoming: KV = {};
    const all = [
      ...COLOR_FIELDS,
      ...TILE_FIELDS,
      ...NAVBAR_FIELDS,
      ...SHAPE_FIELDS,
      ...BASIC_FIELDS,
      ...MUTED_FIELDS,
      ...WARNING_FIELDS,
    ];
    for (const f of all) {
      const raw = (formData.get(f.var) ?? "").toString().trim();
      if (raw) incoming[f.var] = raw;
    }

    const existing = await readTheme();
    const merged: KV = { ...existing, ...incoming };

    await prisma.$executeRawUnsafe(
      `INSERT INTO "AppConfig" (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      "theme",
      JSON.stringify(merged)
    );

    revalidatePath("/", "layout");
    revalidatePath("/members/theme");
  }

  // --- Server action to reset ---
  async function resetTheme() {
    "use server";
    await prisma.$executeRawUnsafe(
      `DELETE FROM "AppConfig" WHERE key = $1`,
      "theme"
    );

    revalidatePath("/", "layout");
    revalidatePath("/members/theme");
  }

  // Small helper to render labeled inputs
  const FieldRow = (f: Field) => {
    const base: React.CSSProperties = { display: "grid", gap: "0.4rem" };
    const inputBase: React.CSSProperties = {
      width: "100%",
      padding: "0.55rem 0.7rem",
      borderRadius: 10,
      border: "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
      background: "var(--color-card)",
    };
    return (
      <label className="tile" style={{ ...base, padding: "0.9rem" }}>
        <div>
          <div style={{ fontWeight: 600 }}>{f.label}</div>
          {"help" in f && f.help ? (
            <div className="muted" style={{ fontSize: "0.85rem", marginTop: 2 }}>
              {f.help}
            </div>
          ) : null}
        </div>
        {f.type === "color" ? (
          <input type="color" name={f.var} defaultValue={theme[f.var] ?? "#000000"} />
        ) : (
          <input
            type="text"
            name={f.var}
            defaultValue={theme[f.var] ?? ""}
            placeholder={("placeholder" in f && f.placeholder) || ""}
            style={inputBase}
          />
        )}
      </label>
    );
  };

  // Compact color picker for button colors (no tile wrapper)
  const CompactColorField = (f: Field) => {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: "1 1 auto", minWidth: "140px" }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{f.label}</div>
        <input
          type="color"
          name={f.var}
          defaultValue={theme[f.var] ?? "#000000"}
          style={{ width: "100%", height: "40px", cursor: "pointer" }}
        />
      </label>
    );
  };

  // Compact text input for other settings (no tile wrapper)
  const CompactTextField = (f: Field) => {
    const inputStyle: React.CSSProperties = {
      width: "100%",
      padding: "0.55rem 0.7rem",
      borderRadius: 8,
      border: "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
      background: "var(--color-card)",
      fontSize: "0.9rem",
      boxSizing: "border-box",
    };
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: "1 1 auto", minWidth: "200px", maxWidth: "280px" }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{f.label}</div>
        {"help" in f && f.help ? (
          <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 2 }}>
            {f.help}
          </div>
        ) : null}
        <input
          type="text"
          name={f.var}
          defaultValue={theme[f.var] ?? ""}
          placeholder={("placeholder" in f && f.placeholder) || ""}
          style={inputStyle}
        />
      </label>
    );
  };

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          Theme Editor
        </h1>
        <p className="muted">Tweak global colors and button styles. Changes apply site-wide.</p>
      </header>

      <form action={saveTheme} className="space-y-6">
        {/* Colors */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Site colors</h2>
          <div className="tile" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {COLOR_FIELDS.map((f) => (
                <CompactColorField key={f.var} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* Tiles/Cards */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Cards & Tiles</h2>
          <div className="tile" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {TILE_FIELDS.map((f) => (
                <CompactTextField key={f.var} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* Navbar */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Navbar</h2>
          <div className="tile" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {NAVBAR_FIELDS.map((f) => (
                f.type === "color" ? (
                  <CompactColorField key={f.var} {...f} />
                ) : (
                  <CompactTextField key={f.var} {...f} />
                )
              ))}
            </div>
          </div>
        </section>

        {/* Buttons: shape */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Buttons — shape</h2>
          <div className="tile" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {SHAPE_FIELDS.map((f) => (
                <CompactTextField key={f.var} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* Buttons: colors */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Buttons — colors</h2>

          {/* Preview — use buttons (no onClick) so it's legal in a Server Component */}
          <div className="tile" style={{ padding: "1rem" }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: "0.9rem" }}>
              Preview
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn btn-basic" type="button">Basic</button>
              <button className="btn btn-muted" type="button">Muted</button>
              <button className="btn btn-warning" type="button">Warning</button>
            </div>
          </div>

          {/* Basic buttons */}
          <div className="tile" style={{ padding: "1rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Basic</div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {BASIC_FIELDS.map((f) => (
                <CompactColorField key={f.var} {...f} />
              ))}
            </div>
          </div>

          {/* Muted buttons */}
          <div className="tile" style={{ padding: "1rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Muted</div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {MUTED_FIELDS.map((f) => (
                <CompactColorField key={f.var} {...f} />
              ))}
            </div>
          </div>

          {/* Warning buttons */}
          <div className="tile" style={{ padding: "1rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Warning</div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {WARNING_FIELDS.map((f) => (
                <CompactColorField key={f.var} {...f} />
              ))}
            </div>
          </div>
        </section>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn btn-basic" type="submit">Save theme</button>
        </div>
      </form>

      {/* Reset form outside the main form */}
      <form action={resetTheme} style={{ marginTop: "1rem" }}>
        <button className="btn btn-warning" type="submit">Reset to Defaults</button>
      </form>
    </main>
  );
}
