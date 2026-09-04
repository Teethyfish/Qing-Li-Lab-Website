export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME, getThemeCatalog, type Theme, type ThemeCategory, type ThemePreset } from "@/lib/theme";

type Props = { searchParams: Promise<{ preset?: string; saved?: string; error?: string }> };
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

async function writePresets(presets: ThemePreset[]) {
  const serializable = presets.map(({ id, name, category, values }) => ({ id, name, category, values }));
  await prisma.appConfig.upsert({ where: { key: "themePresets" }, create: { key: "themePresets", value: JSON.stringify(serializable) }, update: { value: JSON.stringify(serializable) } });
}

function slugifyThemeName(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "theme";
}

export default async function ThemeEditorPage({ searchParams }: Props) {
  const admin = await requireAdminUser().catch(() => redirect("/"));
  const query = await searchParams;
  const catalog = await getThemeCatalog();
  const selected = catalog.find((preset) => preset.id === query.preset)
    || catalog.find((preset) => preset.id === admin.themePreference)
    || catalog[0];
  const theme = { ...DEFAULT_THEME, ...selected.values };

  async function savePreset(formData: FormData) {
    "use server";
    await requireAdminUser();
    const catalog = await getThemeCatalog();
    const destination = String(formData.get("saveTarget") || "light");
    const requestedName = String(formData.get("newThemeName") || "").trim().slice(0, 80);
    const rawCategory = String(formData.get("category") || "custom");
    const category: ThemeCategory = CATEGORIES.includes(rawCategory as ThemeCategory) ? rawCategory as ThemeCategory : "custom";
    const values: Theme = {};
    for (const variable of allVariables) {
      const value = String(formData.get(variable) || "").trim();
      if (value) values[variable] = value;
    }

    const existingTarget = catalog.find((preset) => preset.id === destination);
    if (destination !== "__new__" && !existingTarget) redirect("/members/theme?error=invalid-target");
    if (destination === "__new__" && !requestedName) redirect(`/members/theme?preset=${encodeURIComponent(selected.id)}&error=name-required`);

    const id = destination === "__new__"
      ? `${slugifyThemeName(requestedName)}-${crypto.randomUUID().slice(0, 8)}`
      : destination;
    const name = destination === "__new__" ? requestedName : existingTarget!.name;
    const savedCategory = destination === "__new__" ? category : existingTarget!.category;
    const stored = catalog.map(({ id, name, category, values }) => ({ id, name, category, values }));
    const index = stored.findIndex((preset) => preset.id === id);
    const next = { id, name, category: savedCategory, values };
    if (index >= 0) stored[index] = next;
    else stored.push(next);
    await writePresets(stored);
    // The original single-theme editor stored Light under this legacy key.
    // Once Light is saved into the catalog, remove that duplicate source.
    if (id === "light") await prisma.appConfig.deleteMany({ where: { key: "theme" } });
    revalidatePath("/", "layout");
    redirect(`/members/theme?preset=${encodeURIComponent(id)}&saved=1`);
  }

  async function resetOrDeletePreset(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("presetId") || "");
    await writePresets((await getThemeCatalog()).filter((preset) => preset.id !== id));
    if (id === "light") await prisma.appConfig.deleteMany({ where: { key: "theme" } });
    revalidatePath("/", "layout");
    redirect(`/members/theme?preset=${encodeURIComponent(["light", "dark", "muted"].includes(id) ? id : "light")}`);
  }

  return <main className="mx-auto max-w-5xl p-6 space-y-6" data-edit-ignore="true">
    <header>
      <h1>Theme Editor</h1>
      <p className="muted">Edit the site’s global theme definitions. Members choose among these themes in their Settings.</p>
    </header>

    {query.saved ? <p role="status" className="tile" style={{ borderLeft: "4px solid #15803d" }}>Theme saved and available in member settings.</p> : null}
    {query.error === "name-required" ? <p role="alert" className="tile" style={{ borderLeft: "4px solid #b91c1c" }}>Enter a name before creating an extra theme.</p> : null}
    {query.error === "invalid-target" ? <p role="alert" className="tile" style={{ borderLeft: "4px solid #b91c1c" }}>That theme no longer exists. Choose another destination.</p> : null}

    <section className="tile theme-load-panel">
      <div>
        <h2>Theme being edited</h2>
        <p className="muted">Load a theme’s current values into the editor.</p>
      </div>
      <form method="get" className="theme-load-form">
        <select name="preset" defaultValue={selected.id} aria-label="Theme to edit">
          {CATEGORIES.map((category) => {
            const themes = catalog.filter((preset) => preset.category === category);
            return themes.length ? <optgroup key={category} label={category[0].toUpperCase() + category.slice(1)}>
              {themes.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </optgroup> : null;
          })}
        </select>
        <button className="btn btn-muted" type="submit">Load theme</button>
      </form>
    </section>

    <form action={savePreset} className="space-y-6">
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

      <section className="space-y-3">
        <h2>Button preview</h2>
        <div className="tile theme-button-preview">
          <button className="btn btn-basic" type="button">Basic</button>
          <button className="btn btn-muted" type="button">Muted</button>
          <button className="btn btn-warning" type="button">Warning</button>
        </div>
      </section>

      <section className="tile theme-save-panel">
        <div>
          <h2>Save global theme</h2>
          <p className="muted">Choose which sitewide theme receives the values currently in this editor.</p>
        </div>
        <label><strong>Save these settings to</strong>
          <select name="saveTarget" defaultValue={selected.id}>
            {catalog.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} — {preset.category}</option>)}
            <option value="__new__">+ Create an extra theme</option>
          </select>
        </label>
        <div className="theme-new-fields">
          <label><strong>New theme name</strong><input name="newThemeName" maxLength={80} placeholder="Only needed for an extra theme" /></label>
          <label><strong>New theme category</strong><select name="category" defaultValue="custom">{CATEGORIES.map((category) => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}</select></label>
        </div>
        <div className="theme-editor-actions">
          <button className="btn btn-basic" type="submit">Save theme sitewide</button>
        </div>
      </section>
    </form>

    <form action={resetOrDeletePreset}>
      <input type="hidden" name="presetId" value={selected.id} />
      <button className="btn btn-warning">{selected.builtIn ? `Reset ${selected.name} to defaults` : `Delete ${selected.name}`}</button>
    </form>
  </main>;
}
