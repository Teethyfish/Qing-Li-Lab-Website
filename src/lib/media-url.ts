export type PublicMediaKind = "announcement" | "project" | "user" | "instrument";

export function publicMediaUrl(kind: PublicMediaKind, id: string, slot = "image", version?: Date | string | null) {
  const path = `/api/media/${kind}/${encodeURIComponent(id)}/${encodeURIComponent(slot)}`;
  if (!version) return path;
  const value = version instanceof Date ? version.getTime() : version;
  return `${path}?v=${encodeURIComponent(String(value))}`;
}
