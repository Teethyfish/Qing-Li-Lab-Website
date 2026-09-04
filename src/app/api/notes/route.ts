import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { getCurrentUser } from "@/lib/document-access";
import type { CanvasTextBoxData, DrawingStroke, NotePageData, NoteWorkspaceData, RecentlyDeletedItem, StickyNoteData } from "@/lib/note-types";
import { prisma } from "@/lib/prisma";

const NOTE_COLORS = new Set(["#fff3a6", "#ffd6e0", "#cdeffd", "#d9f7be", "#e8ddff", "#ffffff"]);
const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

function cleanStrokes(value: unknown): DrawingStroke[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).flatMap((entry): DrawingStroke[] => {
    if (!entry || typeof entry !== "object") return [];
    const stroke = entry as Record<string, unknown>;
    const id = typeof stroke.id === "string" ? stroke.id.slice(0, 100) : "";
    const tool = stroke.tool === "eraser" ? "eraser" as const : "pen" as const;
    const color = typeof stroke.color === "string" && /^#[0-9a-f]{6}$/i.test(stroke.color) ? stroke.color : "#111827";
    if (!id || !Array.isArray(stroke.points)) return [];
    const points = stroke.points.slice(0, 2_000).flatMap((point): Array<{ x: number; y: number }> => {
      if (!point || typeof point !== "object") return [];
      const candidate = point as Record<string, unknown>;
      if (typeof candidate.x !== "number" || typeof candidate.y !== "number") return [];
      return [{ x: clamp(candidate.x, 0, 2_000, 0), y: clamp(candidate.y, 0, 1_400, 0) }];
    });
    return points.length ? [{ id, tool, color, width: clamp(stroke.width, 1, 36, 3), points }] : [];
  });
}

function cleanRichText(value: unknown, maxLength: number) {
  const rawHtml = typeof value === "string" ? value.slice(0, maxLength) : "";
  return sanitizeHtml(rawHtml, {
    allowedTags: ["b", "strong", "i", "em", "u", "s", "span", "font", "br", "div", "p", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th"],
    allowedAttributes: {
      "*": ["style"],
      span: ["style"], font: ["color", "face", "size"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan", "scope"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i],
        "font-family": [/^[a-z0-9 ,.'"-]+$/i],
        "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
        "line-height": [/^(?:1|1\.15|1\.5|2)$/],
        "margin-bottom": [/^(?:0|0\.5rem|1rem|1\.5rem)$/],
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
  });
}

function cleanNote(value: unknown): StickyNoteData | null {
  if (!value || typeof value !== "object") return null;
  const note = value as Record<string, unknown>;
  const id = typeof note.id === "string" ? note.id.slice(0, 100) : "";
  if (!id) return null;
  return {
    id,
    subject: typeof note.subject === "string" ? note.subject.trim().slice(0, 120) : "",
    html: cleanRichText(note.html, 50_000),
    x: clamp(note.x, 0, 1_900, 24),
    y: clamp(note.y, 0, 1_300, 24),
    width: clamp(note.width, 180, 700, 280),
    height: clamp(note.height, 140, 700, 220),
    color: typeof note.color === "string" && NOTE_COLORS.has(note.color) ? note.color : "#fff3a6",
    archived: note.archived === true,
    zIndex: Math.round(clamp(note.zIndex, 1, 10_000, 1)),
    strokes: cleanStrokes(note.strokes),
  };
}

function cleanTextBox(value: unknown): CanvasTextBoxData | null {
  if (!value || typeof value !== "object") return null;
  const box = value as Record<string, unknown>;
  const id = typeof box.id === "string" ? box.id.slice(0, 100) : "";
  if (!id) return null;
  return {
    id,
    html: cleanRichText(box.html, 100_000),
    x: clamp(box.x, 0, 1_900, 36),
    y: clamp(box.y, 0, 1_300, 36),
    width: clamp(box.width, 120, 900, 360),
    height: clamp(box.height, 60, 900, 140),
    zIndex: Math.round(clamp(box.zIndex, 1, 10_000, 1)),
  };
}

function cleanRecentlyDeleted(value: unknown): RecentlyDeletedItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).flatMap((entry): RecentlyDeletedItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const deleted = entry as Record<string, unknown>;
    const id = typeof deleted.id === "string" ? deleted.id.slice(0, 100) : "";
    const pageId = typeof deleted.pageId === "string" ? deleted.pageId.slice(0, 100) : "";
    const deletedAt = typeof deleted.deletedAt === "string" && !Number.isNaN(Date.parse(deleted.deletedAt))
      ? new Date(deleted.deletedAt).toISOString()
      : new Date().toISOString();
    if (!id || !pageId) return [];
    if (deleted.kind === "note") {
      const item = cleanNote(deleted.item);
      return item ? [{ id, kind: "note", pageId, deletedAt, item }] : [];
    }
    if (deleted.kind === "textbox") {
      const item = cleanTextBox(deleted.item);
      return item ? [{ id, kind: "textbox", pageId, deletedAt, item }] : [];
    }
    return [];
  });
}

function cleanWorkspace(value: unknown): NoteWorkspaceData | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.pages) || data.pages.length < 1 || data.pages.length > 50) return null;
  let noteCount = 0;
  const pages = data.pages.flatMap((value): NotePageData[] => {
    if (!value || typeof value !== "object") return [];
    const page = value as Record<string, unknown>;
    const id = typeof page.id === "string" ? page.id.slice(0, 100) : "";
    if (!id || !Array.isArray(page.notes)) return [];
    const notes = page.notes.flatMap((note) => {
      if (noteCount >= 500) return [];
      const cleaned = cleanNote(note);
      if (!cleaned) return [];
      noteCount += 1;
      return [cleaned];
    });
    const textBoxes = Array.isArray(page.textBoxes)
      ? page.textBoxes.slice(0, 200).flatMap((box) => {
          const cleaned = cleanTextBox(box);
          return cleaned ? [cleaned] : [];
        })
      : [];
    return [{
      id,
      title: typeof page.title === "string" ? page.title.trim().slice(0, 120) || "Untitled page" : "Untitled page",
      html: cleanRichText(page.html, 200_000),
      strokes: cleanStrokes(page.strokes),
      notes,
      textBoxes,
    }];
  });
  if (!pages.length) return null;
  const requestedActive = typeof data.activePageId === "string" ? data.activePageId : "";
  return {
    version: 1,
    pages,
    activePageId: pages.some((page) => page.id === requestedActive) ? requestedActive : pages[0].id,
    recentlyDeleted: cleanRecentlyDeleted(data.recentlyDeleted),
  };
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 5_000_000) return NextResponse.json({ error: "Notes workspace is too large." }, { status: 413 });
  const rawBody = await request.text();
  if (rawBody.length > 5_000_000) return NextResponse.json({ error: "Notes workspace is too large." }, { status: 413 });
  let body: unknown = null;
  try { body = JSON.parse(rawBody); } catch { /* handled below */ }
  const workspace = cleanWorkspace(body);
  if (!workspace) return NextResponse.json({ error: "Invalid notes workspace." }, { status: 400 });
  await prisma.noteWorkspace.upsert({
    where: { userId: user.id },
    update: { content: workspace as unknown as Prisma.InputJsonValue },
    create: { userId: user.id, content: workspace as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json({ success: true });
}
