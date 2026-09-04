import { prisma } from "@/lib/prisma";

export type Theme = Record<string, string>;
export type ThemeCategory = "light" | "dark" | "muted" | "custom";
export type ThemePreset = {
  id: string;
  name: string;
  category: ThemeCategory;
  values: Theme;
  builtIn?: boolean;
};

const LEGACY_FONT = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
const EDITORIAL_FONT = '"Times New Roman", Times, serif';
const SANS_FONT = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const DEFAULT_THEME: Theme = {
  "--color-bg": "#ffffff",
  "--color-content-bg": "#f8fafc",
  "--color-text": "#111827",
  "--color-muted": "#6b7280",
  "--color-accent": "#2563eb",
  "--color-card": "#ffffff",
  "--font-family": SANS_FONT,
  "--font-size": "16px",
  "--btn-font-family": "var(--font-family)",
  "--btn-font-size": "14",
  "--radius-sm": "1px",
  "--radius-md": "2px",
  "--radius-lg": "3px",
  "--tile-radius": "2",
  "--tile-padding": "1",
  "--tile-border-opacity": "12",
  "--tile-shadow-opacity": "14",
  "--btn-radius": "2",
  "--btn-py": "0.55",
  "--btn-px": "0.9",
  "--btn-weight": "600",
  "--btn-basic-bg": "#111827",
  "--btn-basic-fg": "#ffffff",
  "--btn-basic-hover-bg": "#0a0f1a",
  "--btn-basic-border-color": "#111827",
  "--btn-muted-bg": "#f5f5f5",
  "--btn-muted-fg": "#111827",
  "--btn-muted-hover-bg": "#ededed",
  "--btn-muted-border-color": "#e5e7eb",
  "--btn-warning-bg": "#f59e0b",
  "--btn-warning-fg": "#ffffff",
  "--btn-warning-hover-bg": "#d97706",
  "--btn-warning-border-color": "#f59e0b",
  "--nav-bg": "#ffffff",
  "--nav-opacity": "90",
  "--nav-text": "#111827",
  "--nav-border": "#e5e7eb",
  "--nav-height": "56",
  "--nav-blur": "6",
};

const DARK_THEME: Theme = {
  ...DEFAULT_THEME,
  "--color-bg": "#090b0f",
  "--color-content-bg": "#11151b",
  "--color-text": "#f3f4f6",
  "--color-muted": "#a9b0bb",
  "--color-accent": "#8db8ff",
  "--color-card": "#171c24",
  "--btn-basic-bg": "#f3f4f6",
  "--btn-basic-fg": "#111318",
  "--btn-basic-hover-bg": "#dfe3e8",
  "--btn-basic-border-color": "#f3f4f6",
  "--btn-muted-bg": "#252b34",
  "--btn-muted-fg": "#f3f4f6",
  "--btn-muted-hover-bg": "#303844",
  "--btn-muted-border-color": "#414a57",
  "--nav-bg": "#0d1015",
  "--nav-text": "#f3f4f6",
  "--nav-border": "#303640",
};

const MUTED_THEME: Theme = {
  ...DEFAULT_THEME,
  "--color-bg": "#e9e7e1",
  "--color-content-bg": "#f2f0ea",
  "--color-text": "#292c2c",
  "--color-muted": "#656b69",
  "--color-accent": "#4d6862",
  "--color-card": "#faf9f5",
  "--btn-basic-bg": "#405650",
  "--btn-basic-fg": "#ffffff",
  "--btn-basic-hover-bg": "#334640",
  "--btn-basic-border-color": "#405650",
  "--btn-muted-bg": "#e3e1da",
  "--btn-muted-fg": "#292c2c",
  "--btn-muted-hover-bg": "#d8d5cc",
  "--btn-muted-border-color": "#c9c6bc",
  "--nav-bg": "#f7f5ef",
  "--nav-text": "#292c2c",
  "--nav-border": "#cfccc3",
};

export const BUILT_IN_THEMES: ThemePreset[] = [
  { id: "light", name: "Light", category: "light", values: DEFAULT_THEME, builtIn: true },
  { id: "dark", name: "Dark", category: "dark", values: DARK_THEME, builtIn: true },
  { id: "muted", name: "Muted", category: "muted", values: MUTED_THEME, builtIn: true },
];

export function normalizeLegacyTheme(theme: Theme): Theme {
  const normalized = { ...theme };
  if (!normalized["--font-family"] || normalized["--font-family"] === LEGACY_FONT || normalized["--font-family"] === EDITORIAL_FONT) normalized["--font-family"] = SANS_FONT;
  if (!normalized["--btn-font-family"]) normalized["--btn-font-family"] = "var(--font-family)";
  if (normalized["--tile-radius"] === "12") normalized["--tile-radius"] = "2";
  if (normalized["--btn-radius"] === "10") normalized["--btn-radius"] = "2";
  if (normalized["--tile-shadow-opacity"] === "8") normalized["--tile-shadow-opacity"] = "14";
  return normalized;
}

function isThemeCategory(value: unknown): value is ThemeCategory {
  return value === "light" || value === "dark" || value === "muted" || value === "custom";
}

function parsePresetList(value?: string): ThemePreset[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<ThemePreset>;
      if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || !isThemeCategory(candidate.category) || !candidate.values || typeof candidate.values !== "object") return [];
      return [{ id: candidate.id, name: candidate.name, category: candidate.category, values: normalizeLegacyTheme(candidate.values as Theme) }];
    });
  } catch {
    return [];
  }
}

export async function getThemeCatalog(): Promise<ThemePreset[]> {
  const rows = await prisma.appConfig.findMany({ where: { key: { in: ["theme", "themePresets"] } }, select: { key: true, value: true } });
  const legacyValue = rows.find((row) => row.key === "theme")?.value;
  let legacyTheme: Theme = {};
  try { legacyTheme = legacyValue ? normalizeLegacyTheme(JSON.parse(legacyValue) as Theme) : {}; } catch { legacyTheme = {}; }
  const saved = parsePresetList(rows.find((row) => row.key === "themePresets")?.value);
  const overrides = new Map(saved.map((preset) => [preset.id, preset]));
  return BUILT_IN_THEMES.map((preset) => {
    const override = overrides.get(preset.id);
    overrides.delete(preset.id);
    return {
      ...preset,
      name: override?.name || preset.name,
      category: override?.category || preset.category,
      values: { ...preset.values, ...(preset.id === "light" ? legacyTheme : {}), ...(override?.values || {}) },
    };
  }).concat([...overrides.values()]);
}

export async function getTheme(preference = "light"): Promise<Theme> {
  const catalog = await getThemeCatalog();
  const preset = catalog.find((item) => item.id === preference) || catalog.find((item) => item.id === "light");
  return { ...DEFAULT_THEME, ...(preset?.values || {}) };
}

export function themeToCss(theme: Theme) {
  const lines = Object.entries(theme).map(([key, value]) => `  ${key}: ${value};`);
  return `:root {\n${lines.join("\n")}\n}`;
}
