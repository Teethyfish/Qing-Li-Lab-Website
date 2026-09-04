import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { getCurrentUser } from "@/lib/document-access";
import type { NotePageData, NoteWorkspaceData, StickyNoteData } from "@/lib/note-types";
import { prisma } from "@/lib/prisma";

const NOTE_COLORS = new Set(["#fff3a6", "#ffd6e0", "#cdeffd", "#d9f7be", "#e8ddff", "#ffffff"]);
const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

function cleanNote(value: unknown): StickyNoteData | null {
  if (!value || typeof value !== "object") return null;
  const note = value as Record<string, unknown>;
  const id = typeof note.id === "string" ? note.id.slice(0, 100) : "";
  const rawHtml = typeof note.html === "string" ? note.html.slice(0, 50_000) : "";
  if (!id) return null;
  const html = sanitizeHtml(rawHtml, {
    allowedTags: ["b", "strong", "i", "em", "u", "s", "span", "font", "br", "div", "p", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th"],
    allowedAttributes: {
      span: ["style"], font: ["color", "face", "size"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan", "scope"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i],
        "font-family": [/^[a-z0-9 ,.'"-]+$/i],
        "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
  });
  return {
    id,
    html,
    x: clamp(note.x, 0, 1_900, 24),
    y: clamp(note.y, 0, 1_300, 24),
    width: clamp(note.width, 180, 700, 280),
    height: clamp(note.height, 140, 700, 220),
    color: typeof note.color === "string" && NOTE_COLORS.has(note.color) ? note.color : "#fff3a6",
    archived: note.archived === true,
    zIndex: Math.round(clamp(note.zIndex, 1, 10_000, 1)),
  };
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
    return [{ id, title: typeof page.title === "string" ? page.title.trim().slice(0, 120) || "Untitled page" : "Untitled page", notes }];
  });
  if (!pages.length) return null;
  const requestedActive = typeof data.activePageId === "string" ? data.activePageId : "";
  return { version: 1, pages, activePageId: pages.some((page) => page.id === requestedActive) ? requestedActive : pages[0].id };
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const workspace = cleanWorkspace(body);
  if (!workspace) return NextResponse.json({ error: "Invalid notes workspace." }, { status: 400 });
  await prisma.noteWorkspace.upsert({
    where: { userId: user.id },
    update: { content: workspace as unknown as Prisma.InputJsonValue },
    create: { userId: user.id, content: workspace as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json({ success: true });
}
