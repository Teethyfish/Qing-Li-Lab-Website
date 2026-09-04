export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME, getThemeCatalog, type Theme, type ThemeCategory, type ThemePreset } from "@/lib/theme";
import ThemeManagementActions from "./ThemeManagementActions";

type Props = { searchParams: Promise<{ preset?: string; saved?: string; renamed?: string; deleted?: string; error?: string }> };
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
    { variable: "--btn-font-family", label: "Button font family", type: "text" },
    { variable: "--btn-font-size", label: "Button font size", type: "range", min: 10, max: 24, step: 1, unit: "px" },
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
  const t = await getTranslations('themeEditor');
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

  async function renamePreset(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("presetId") || "");
    const name = String(formData.get("themeName") || "").trim().slice(0, 80);
    const catalog = await getThemeCatalog();
    if (!name) redirect(`/members/theme?preset=${encodeURIComponent(id)}&error=name-required`);
    if (!catalog.some((preset) => preset.id === id)) redirect("/members/theme?error=invalid-target");
    await writePresets(catalog.map((preset) => preset.id === id ? { ...preset, name } : preset));
    revalidatePath("/", "layout");
    redirect(`/members/theme?preset=${encodeURIComponent(id)}&renamed=1`);
  }

  async function deletePreset(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("presetId") || "");
    const catalog = await getThemeCatalog();
    const target = catalog.find((preset) => preset.id === id);
    if (!target) redirect("/members/theme?error=invalid-target");
    if (target.builtIn) redirect(`/members/theme?preset=${encodeURIComponent(id)}&error=protected-theme`);

    await prisma.$transaction([
      prisma.user.updateMany({ where: { themePreference: id }, data: { themePreference: "light" } }),
      prisma.appConfig.upsert({
        where: { key: "themePresets" },
        create: { key: "themePresets", value: JSON.stringify(catalog.filter((preset) => preset.id !== id).map(({ id, name, category, values }) => ({ id, name, category, values }))) },
        update: { value: JSON.stringify(catalog.filter((preset) => preset.id !== id).map(({ id, name, category, values }) => ({ id, name, category, values }))) },
      }),
    ]);
    revalidatePath("/", "layout");
    redirect("/members/theme?preset=light&deleted=1");
  }

  async function resetPreset(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("presetId") || "");
    if (!CATEGORIES.slice(0, 3).includes(id as ThemeCategory)) redirect("/members/theme?error=invalid-target");
    await writePresets((await getThemeCatalog()).filter((preset) => preset.id !== id));
    if (id === "light") await prisma.appConfig.deleteMany({ where: { key: "theme" } });
    revalidatePath("/", "layout");
    redirect(`/members/theme?preset=${encodeURIComponent(id)}`);
  }

  return <main className="mx-auto max-w-5xl p-6 space-y-6" data-edit-ignore="true">
    <header>
      <h1>{t('heading')}</h1>
      <p className="muted">{t('description')}</p>
    </header>

    {query.saved ? <p role="status" className="tile" style={{ borderLeft: "4px solid #15803d" }}>{t('saved')}</p> : null}
    {query.renamed ? <p role="status" className="tile" style={{ borderLeft: "4px solid #15803d" }}>{t('renamed')}</p> : null}
    {query.deleted ? <p role="status" className="tile" style={{ borderLeft: "4px solid #15803d" }}>{t('deleted')}</p> : null}
    {query.error === "name-required" ? <p role="alert" className="tile" style={{ borderLeft: "4px solid #b91c1c" }}>{t('nameRequired')}</p> : null}
    {query.error === "invalid-target" ? <p role="alert" className="tile" style={{ borderLeft: "4px solid #b91c1c" }}>{t('invalidTarget')}</p> : null}
    {query.error === "protected-theme" ? <p role="alert" className="tile" style={{ borderLeft: "4px solid #b91c1c" }}>{t('protectedTheme')}</p> : null}

    <section className="tile theme-load-panel">
      <div>
        <h2>{t('beingEdited')}</h2>
        <p className="muted">{t('loadDescription')}</p>
      </div>
      <form method="get" className="theme-load-form">
        <select name="preset" defaultValue={selected.id} aria-label={t('themeToEdit')}>
          {CATEGORIES.map((category) => {
            const themes = catalog.filter((preset) => preset.category === category);
            return themes.length ? <optgroup key={category} label={t(`categories.${category}`)}>
              {themes.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </optgroup> : null;
          })}
        </select>
        <button className="btn btn-muted" type="submit">{t('loadTheme')}</button>
      </form>
    </section>

    <form action={savePreset} className="space-y-6">
      {GROUPS.map((group) => <section key={group.title} className="space-y-3">
        <h2>{t(`groups.${group.title}`)}</h2>
        <div className="tile theme-field-grid">
          {group.fields.map((field) => <label key={field.variable} className="theme-field">
            <span><strong>{t(`fields.${field.label}`)}</strong>{field.unit ? <small>{theme[field.variable]}{field.unit}</small> : null}</span>
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
        <h2>{t('buttonPreview')}</h2>
        <div className="tile theme-button-preview">
          <button className="btn btn-basic" type="button">{t('basic')}</button>
          <button className="btn btn-muted" type="button">{t('muted')}</button>
          <button className="btn btn-warning" type="button">{t('warning')}</button>
        </div>
      </section>

      <section className="tile theme-save-panel">
        <div>
          <h2>{t('saveGlobal')}</h2>
          <p className="muted">{t('saveDescription')}</p>
        </div>
        <label><strong>{t('saveSettingsTo')}</strong>
          <select name="saveTarget" defaultValue={selected.id}>
            {catalog.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} — {t(`categories.${preset.category}`)}</option>)}
            <option value="__new__">+ {t('createExtra')}</option>
          </select>
        </label>
        <div className="theme-new-fields">
          <label><strong>{t('newThemeName')}</strong><input name="newThemeName" maxLength={80} placeholder={t('newThemePlaceholder')} /></label>
          <label><strong>{t('newThemeCategory')}</strong><select name="category" defaultValue="custom">{CATEGORIES.map((category) => <option key={category} value={category}>{t(`categories.${category}`)}</option>)}</select></label>
        </div>
        <div className="theme-editor-actions">
          <button className="btn btn-basic" type="submit">{t('saveSitewide')}</button>
        </div>
      </section>
    </form>

    <ThemeManagementActions
      presetId={selected.id}
      currentName={selected.name}
      canDelete={!selected.builtIn}
      renameAction={renamePreset}
      deleteAction={deletePreset}
      labels={{
        rename: t('manageTheme'),
        name: t('themeName'),
        saveName: t('renameTheme'),
        delete: t('deleteTheme', {name: selected.name}),
        confirmDelete: t('confirmDeleteTheme', {name: selected.name}),
        protectedTheme: t('protectedTheme'),
      }}
    />

    {selected.builtIn ? <form action={resetPreset}>
      <input type="hidden" name="presetId" value={selected.id} />
      <button className="btn btn-warning">{t('resetToDefaults', {name: selected.name})}</button>
    </form> : null}
  </main>;
}
