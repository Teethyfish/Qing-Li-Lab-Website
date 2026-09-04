export type ProjectParticipantInput = { userId: string; isCurrent: boolean };

export function projectSlug(value: unknown) {
  return typeof value === "string"
    ? value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)
    : "";
}

export function projectText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function projectImage(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 900_000) return null;
  return /^data:image\/(?:jpeg|png|webp);base64,/i.test(value) ? value : null;
}

export function supportingProjectImages(value: unknown) {
  return Array.isArray(value) ? value.slice(0, 4).flatMap((image) => {
    const safe = projectImage(image);
    return safe ? [safe] : [];
  }) : [];
}

export function projectParticipants(value: unknown): ProjectParticipantInput[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as { userId?: unknown; isCurrent?: unknown };
    const userId = projectText(item.userId, 100);
    if (!userId || seen.has(userId)) return [];
    seen.add(userId);
    return [{ userId, isCurrent: item.isCurrent !== false }];
  });
}
