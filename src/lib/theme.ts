// src/lib/theme.ts
import { prisma } from "@/lib/prisma";

export type Theme = {
  colors: { bg: string; text: string; muted: string; primary: string; accent: string };
  font: { family: string; size: string };
  radius: { sm: string; md: string; lg: string };
};

const DEFAULT_THEME: Theme = {
  colors: {
    bg: "#ffffff",
    text: "#111827",
    muted: "#6b7280",
    primary: "#2563eb",
    accent: "#059669",
  },
  font: {
    family: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    size: "16px",
  },
  radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem" },
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
    return {
      colors: { ...DEFAULT_THEME.colors, ...(parsed?.colors ?? {}) },
      font: { ...DEFAULT_THEME.font, ...(parsed?.font ?? {}) },
      radius: { ...DEFAULT_THEME.radius, ...(parsed?.radius ?? {}) },
    };
  } catch {
    return DEFAULT_THEME;
  }
}

export async function saveTheme(t: Theme) {
  // minimal sanitize + merge defaults
  const theme: Theme = {
    colors: {
      bg: String(t.colors?.bg ?? DEFAULT_THEME.colors.bg),
      text: String(t.colors?.text ?? DEFAULT_THEME.colors.text),
      muted: String(t.colors?.muted ?? DEFAULT_THEME.colors.muted),
      primary: String(t.colors?.primary ?? DEFAULT_THEME.colors.primary),
      accent: String(t.colors?.accent ?? DEFAULT_THEME.colors.accent),
    },
    font: {
      family: String(t.font?.family ?? DEFAULT_THEME.font.family),
      size: String(t.font?.size ?? DEFAULT_THEME.font.size),
    },
    radius: {
      sm: String(t.radius?.sm ?? DEFAULT_THEME.radius.sm),
      md: String(t.radius?.md ?? DEFAULT_THEME.radius.md),
      lg: String(t.radius?.lg ?? DEFAULT_THEME.radius.lg),
    },
  };

  await prisma.$executeRawUnsafe(
    `insert into "AppConfig"(key, value)
     values ($1, $2)
     on conflict(key) do update set value = excluded.value`,
    "theme",
    JSON.stringify(theme)
  );
}

/** Convert Theme -> CSS custom properties for :root */
export function themeToCss(theme: Theme) {
  const { colors, font, radius } = theme;
  return `
:root {
  --color-bg: ${colors.bg};
  --color-text: ${colors.text};
  --color-muted: ${colors.muted};
  --color-primary: ${colors.primary};
  --color-accent: ${colors.accent};

  --font-family: ${font.family};
  --font-size: ${font.size};

  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
}
  `.trim();
}
