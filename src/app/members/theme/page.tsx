export const runtime = "nodejs";

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME, getThemeCatalog, type Theme, type ThemeCategory, type ThemePreset } from "@/lib/theme";

type Props = { searchParams: Promise<{ preset?: string; saved?: string }> };
type Field = { variable: string; label: string; type: "color" | "text" | "range"; min?: number; max?: number; step?: number; unit?: string };

const GROUPS: Array<{ title: string; fields: Field[] }> = [
  { title: "Site colors", fields: [
    { variable: "--color-bg", label: "Outer background", type: "color" },
    { variable: "--color-content-bg", label: "Center content background", type: "color" },
    { variable: "--color-text", label: "Text", type: "color" },
    { variable: "--color-muted", label: "Muted text", type: "color" },
    { variable: "--color-accent", label: "Accent", type: "color" },
    { variable: "--color-card", label: "Card background", type: "color" },
  ] },
  { title: "Typography", fields: [
    { variable: "--font-family", label: "Font family", type: "text" },
  ] },
  { title: "Cards and tiles", fields: [
    { variable: "--tile-radius", label: "Corner radius", type: "range", min: 0, max: 24, step: 1, unit: "px" },
    { variable: "--tile-padding", label: "Padding", type: "range", min: .25, max: 3, step: .25, unit: "rem" },
    { variable: "--tile-border-opacity", label: "Border opacity", type: "range", min: 0, max: 100, step: 1, unit: "%" },
    { variable: "--tile-shadow-opacity", label: "Shadow opacity", type: "range", min: 0, max: 100, step: 1, unit: "%" },
  ] },
  { title: "Navigation", fields: [
    { variable: "--nav-bg", label: "Background", type: "color" },
    { variable: "--nav-text", label: "Text", type: "color" },
    { variable: "--nav-border", label: "Border", type: "color" },
    { variable: "--nav-opacity", label: "Opacity", type: "range", min: 0, max: 100, step: 1, unit: "%" },
    { variable: "--nav-height", label: "Height", type: "range", min: 40, max: 80, step: 2, unit: "px" },
    { variable: "--nav-blur", label: "Backdrop blur", type: "range", min: 0, max: 20, step: 1, unit: "px" },
  ] },
  { title: "Buttons", fields: [
    { variable: "--btn-radius", label: "Corner radius", type: "range", min: 0, max: 20, step: 1, unit: "px" },
    { variable: "--btn-py", label: "Vertical padding", type: "range", min: .25, max: 1.5, step: .05, unit: "rem" },
    { variable: "--btn-px", label: "Horizontal padding", type: "range", min: .25, max: 2, step: .05, unit: "rem" },
    { variable: "--btn-weight", label: "Font weight", type: "range", min: 300, max: 900, step: 100 },
    { variable: "--btn-basic-bg", label: "Primary background", type: "color" },
    { variable: "--btn-basic-fg", label: "Primary text", type: "color" },
    { variable: "--btn-basic-hover-bg", label: "Primary hover", type: "color" },
    { variable: "--btn-basic-border-color", label: "Primary border", type: "color" },
    { variable: "--btn-muted-bg", label: "Muted background", type: "color" },
    { variable: "--btn-muted-fg", label: "Muted text", type: "color" },
    { variable: "--btn-muted-hover-bg", label: "Muted hover", type: "color" },
    { variable: "--btn-muted-border-color", label: "Muted border", type: "color" },
    { variable: "--btn-warning-bg", label: "Warning background", type: "color" },
    { variable: "--btn-warning-fg", label: "Warning text", type: "color" },
    { variable: "--btn-warning-hover-bg", label: "Warning hover", type: "color" },
    { variable: "--btn-warning-border-color", label: "Warning border", type: "color" },
  ] },
];

const CATEGORIES: ThemeCategory[] = ["light", "dark", "muted", "custom"];
const allVariables = GROUPS.flatMap((group) => group.fields.map((field) => field.variable));

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (String((session?.user as { role?: string } | undefined)?.role || "").toUpperCase() !== "ADMIN") redirect("/");
}

async function writePresets(presets: ThemePreset[]) {
  const serializable = presets.map(({ id, name, category, values }) => ({ id, name, category, values }));
  await prisma.appConfig.upsert({ where: { key: "themePresets" }, create: { key: "themePresets", value: JSON.stringify(serializable) }, update: { value: JSON.stringify(serializable) } });
}

function slugifyThemeName(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "theme";
}

export default async function ThemeEditorPage({ searchParams }: Props) {
  await requireAdmin();
  const query = await searchParams;
  const catalog = await getThemeCatalog();
  const selected = catalog.find((preset) => preset.id === query.preset) || catalog[0];
  const theme = { ...DEFAULT_THEME, ...selected.values };

  async function savePreset(formData: FormData) {
    "use server";
    await requireAdmin();
    const catalog = await getThemeCatalog();
    const currentId = String(formData.get("presetId") || "light");
    const mode = String(formData.get("saveMode") || "update");
    const name = String(formData.get("themeName") || "Untitled theme").trim().slice(0, 80) || "Untitled theme";
    const rawCategory = String(formData.get("category") || "custom");
    const category: ThemeCategory = CATEGORIES.includes(rawCategory as ThemeCategory) ? rawCategory as ThemeCategory : "custom";
    const values: Theme = {};
    for (const variable of allVariables) {
      const value = String(formData.get(variable) || "").trim();
      if (value) values[variable] = value;
    }

    const id = mode === "new"
      ? `${slugifyThemeName(name)}-${crypto.randomUUID().slice(0, 8)}`
      : currentId;
    const stored = catalog.map(({ id, name, category, values }) => ({ id, name, category, values }));
    const index = stored.findIndex((preset) => preset.id === id);
    const next = { id, name, category, values };
    if (index >= 0) stored[index] = next;
    else stored.push(next);
    await writePresets(stored);
    revalidatePath("/", "layout");
    redirect(`/members/theme?preset=${encodeURIComponent(id)}&saved=1`);
  }

  async function deletePreset(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = String(formData.get("presetId") || "");
    if (["light", "dark", "muted"].includes(id)) return;
    await writePresets((await getThemeCatalog()).filter((preset) => preset.id !== id));
    revalidatePath("/", "layout");
    redirect("/members/theme");
  }

  return <main className="mx-auto max-w-5xl p-6 space-y-6" data-edit-ignore="true">
    <header>
      <h1>Theme Editor</h1>
      <p className="muted">Organize themes by style, edit the built-in choices, or save additional themes for members.</p>
    </header>

    {query.saved ? <p role="status" className="tile" style={{ borderLeft: "4px solid #15803d" }}>Theme saved and available in member settings.</p> : null}

    <section className="theme-catalog">
      {CATEGORIES.map((category) => {
        const presets = catalog.filter((preset) => preset.category === category);
        if (!presets.length) return null;
        return <div key={category} className="theme-catalog-group">
          <h2>{category[0].toUpperCase() + category.slice(1)}</h2>
          <div className="theme-preset-row">{presets.map((preset) => <Link
            key={preset.id}
            href={`/members/theme?preset=${encodeURIComponent(preset.id)}`}
            className={`theme-preset-card${preset.id === selected.id ? " selected" : ""}`}
          >
            <span className="theme-swatches" aria-hidden="true">
              {["--color-bg", "--color-content-bg", "--color-card", "--color-accent"].map((variable) => <i key={variable} style={{ background: preset.values[variable] }} />)}
            </span>
            <strong>{preset.name}</strong>
          </Link>)}</div>
        </div>;
      })}
    </section>

    <form action={savePreset} className="space-y-6">
      <input type="hidden" name="presetId" value={selected.id} />
      <section className="tile theme-identity-fields">
        <label><strong>Theme name</strong><input name="themeName" defaultValue={selected.name} maxLength={80} required /></label>
        <label><strong>Category</strong><select name="category" defaultValue={selected.category}>{CATEGORIES.map((category) => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}</select></label>
      </section>

      {GROUPS.map((group) => <section key={group.title} className="space-y-3">
        <h2>{group.title}</h2>
        <div className="tile theme-field-grid">
          {group.fields.map((field) => <label key={field.variable} className="theme-field">
            <span><strong>{field.label}</strong>{field.unit ? <small>{theme[field.variable]}{field.unit}</small> : null}</span>
            <input
              type={field.type}
              name={field.variable}
              defaultValue={theme[field.variable] || (field.type === "color" ? "#000000" : "")}
              min={field.min}
              max={field.max}
              step={field.step}
            />
          </label>)}
        </div>
      </section>)}

      <div className="theme-editor-actions">
        <button className="btn btn-basic" name="saveMode" value="update">Save changes</button>
        <button className="btn btn-muted" name="saveMode" value="new">Save as extra theme</button>
      </div>
    </form>

    {!selected.builtIn ? <form action={deletePreset}><input type="hidden" name="presetId" value={selected.id} /><button className="btn btn-warning">Delete this theme</button></form> : null}
  </main>;
}
