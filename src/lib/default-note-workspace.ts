import crypto from "node:crypto";
import type { NotePageData, NoteWorkspaceData } from "@/lib/note-types";
import { prisma } from "@/lib/prisma";

export const DEFAULT_NOTE_WORKSPACE_KEY = "notes.defaultWorkspace";

function clonePage(page: NotePageData): NotePageData {
  return {
    ...page,
    id: crypto.randomUUID(),
    html: page.html || "",
    strokes: (page.strokes || []).map((stroke) => ({
      ...stroke,
      id: crypto.randomUUID(),
      points: stroke.points.map((point) => ({ ...point })),
    })),
    notes: (page.notes || []).map((note) => ({
      ...note,
      id: crypto.randomUUID(),
      strokes: (note.strokes || []).map((stroke) => ({
        ...stroke,
        id: crypto.randomUUID(),
        points: stroke.points.map((point) => ({ ...point })),
      })),
    })),
    textBoxes: (page.textBoxes || []).map((box) => ({
      ...box,
      id: crypto.randomUUID(),
    })),
  };
}

export async function createDefaultNoteWorkspace(fallbackPageTitle: string): Promise<NoteWorkspaceData> {
  const storedTemplate = await prisma.appConfig.findUnique({
    where: { key: DEFAULT_NOTE_WORKSPACE_KEY },
    select: { value: true },
  });

  if (storedTemplate?.value) {
    try {
      const template = JSON.parse(storedTemplate.value) as Partial<NoteWorkspaceData>;
      if (Array.isArray(template.pages) && template.pages.length) {
        const pages = template.pages.slice(0, 2).map((page) => clonePage(page));
        return {
          version: 1,
          activePageId: pages[0].id,
          pages,
          recentlyDeleted: [],
        };
      }
    } catch {
      // A malformed template should never prevent a member from opening Notes.
    }
  }

  const pageId = crypto.randomUUID();
  return {
    version: 1,
    activePageId: pageId,
    pages: [{ id: pageId, title: fallbackPageTitle, html: "", strokes: [], notes: [], textBoxes: [] }],
    recentlyDeleted: [],
  };
}
