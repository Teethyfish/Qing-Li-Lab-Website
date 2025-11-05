// src/lib/theme.ts
import { prisma } from "@/lib/prisma";

/** Theme is now a flat key-value map of CSS variables */
export type Theme = Record<string, string>;

const DEFAULT_THEME: Theme = {
  "--color-bg": "#ffffff",
  "--color-text": "#111827",
  "--color-muted": "#6b7280",
  "--color-accent": "#2563eb",
  "--color-card": "#ffffff",
  "--font-family": "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  "--font-size": "16px",
  "--radius-sm": "0.25rem",
  "--radius-md": "0.5rem",
  "--radius-lg": "0.75rem",
};

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
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return DEFAULT_THEME;
  }
}

/** Convert Theme -> CSS custom properties for :root */
export function themeToCss(theme: Theme) {
  const lines = Object.entries(theme).map(([key, value]) => `  ${key}: ${value};`);
  return `:root {\n${lines.join('\n')}\n}`;
}
