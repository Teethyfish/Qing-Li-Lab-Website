// src/lib/theme.ts
import { prisma } from "@/lib/prisma";

/** Theme is now a flat key-value map of CSS variables */
export type Theme = Record<string, string>;

const LEGACY_FONT = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
const EDITORIAL_FONT = '"Times New Roman", Times, serif';

const DEFAULT_THEME: Theme = {
  "--color-bg": "#ffffff",
  "--color-content-bg": "#f8fafc",
  "--color-text": "#111827",
  "--color-muted": "#6b7280",
  "--color-accent": "#2563eb",
  "--color-card": "#ffffff",
  "--font-family": EDITORIAL_FONT,
  "--font-size": "16px",
  "--radius-sm": "1px",
  "--radius-md": "2px",
  "--radius-lg": "3px",
};

export function normalizeLegacyTheme(theme: Theme): Theme {
  const normalized = { ...theme };

  if (!normalized["--font-family"] || normalized["--font-family"] === LEGACY_FONT) {
    normalized["--font-family"] = EDITORIAL_FONT;
  }
  if (normalized["--tile-radius"] === "12") normalized["--tile-radius"] = "2";
  if (normalized["--btn-radius"] === "10") normalized["--btn-radius"] = "2";
  if (normalized["--tile-shadow-opacity"] === "8") {
    normalized["--tile-shadow-opacity"] = "14";
  }

  return normalized;
}

export async function getTheme(): Promise<Theme> {
  // read from AppConfig
  const rows = await prisma.$queryRawUnsafe<{ value: string }[]>(
    `select value from "AppConfig" where key = $1`,
    "theme"
  );
  if (!rows?.[0]?.value) return DEFAULT_THEME;

  try {
    const parsed = JSON.parse(rows[0].value);
    // Merge with defaults to ensure all variables exist
    return { ...DEFAULT_THEME, ...normalizeLegacyTheme(parsed) };
  } catch {
    return DEFAULT_THEME;
  }
}

/** Convert Theme -> CSS custom properties for :root */
export function themeToCss(theme: Theme) {
  const lines = Object.entries(theme).map(([key, value]) => `  ${key}: ${value};`);
  return `:root {\n${lines.join('\n')}\n}`;
}
