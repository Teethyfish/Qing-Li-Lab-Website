import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/document-access";
import type { NoteWorkspaceData } from "@/lib/note-types";
import { prisma } from "@/lib/prisma";
import NotesWorkspace from "./NotesWorkspace";
import { getTranslations } from "next-intl/server";

export default async function NotesPage() {
  const user = await getCurrentUser();
  const t = await getTranslations("sitePages.notes");
  if (!user?.isActive) redirect("/login");
  const [stored, reminders] = await Promise.all([
    prisma.noteWorkspace.findUnique({ where: { userId: user.id } }),
    prisma.reminder.findMany({ where: { userId: user.id }, orderBy: { remindAt: "asc" } }),
  ]);
  const pageId = crypto.randomUUID();
  const fallback: NoteWorkspaceData = { version: 1, activePageId: pageId, pages: [{ id: pageId, title: t("page", { number: 1 }), html: "", strokes: [], notes: [], textBoxes: [] }] };
  const initialWorkspace = stored?.content && typeof stored.content === "object"
    ? stored.content as unknown as NoteWorkspaceData
    : fallback;

  return <main className="notes-page-shell">
    <header><h1>{t("title")}</h1><p className="muted">{t("subtitle")}</p></header>
    <NotesWorkspace
      initialWorkspace={initialWorkspace}
      initialReminders={reminders.map((reminder) => ({ id: reminder.id, message: reminder.message, remindAt: reminder.remindAt.toISOString(), emailedAt: reminder.emailedAt?.toISOString() || null }))}
    />
  </main>;
}
