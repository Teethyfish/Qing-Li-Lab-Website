export function localizedContent(value: string, locale: string) {
  try {
    const translations = JSON.parse(value) as Record<string, unknown>;
    const candidates = locale === "zh-Hant"
      ? [translations["zh-Hant"], translations.zh, translations.en]
      : [translations[locale], translations.en];
    const localized = candidates.find((candidate) => typeof candidate === "string" && candidate.length > 0)
      ?? Object.values(translations).find((candidate) => typeof candidate === "string" && candidate.length > 0);
    return typeof localized === "string" ? localized : value;
  } catch {
    return value;
  }
}
