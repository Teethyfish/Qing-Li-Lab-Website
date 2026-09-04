import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { createDefaultNoteWorkspace } from "@/lib/default-note-workspace";
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
  let initialWorkspace: NoteWorkspaceData;
  if (stored?.content && typeof stored.content === "object") {
    initialWorkspace = stored.content as unknown as NoteWorkspaceData;
  } else {
    const defaultWorkspace = await createDefaultNoteWorkspace(t("page", { number: 1 }));
    const seeded = await prisma.noteWorkspace.upsert({
      where: { userId: user.id },
      create: { userId: user.id, content: defaultWorkspace as unknown as Prisma.InputJsonValue },
      update: {},
      select: { content: true },
    });
    initialWorkspace = seeded.content as unknown as NoteWorkspaceData;
  }

  return <main className="notes-page-shell">
    <header><h1>{t("title")}</h1><p className="muted">{t("subtitle")}</p></header>
    <NotesWorkspace
      initialWorkspace={initialWorkspace}
      initialReminders={reminders.map((reminder) => ({ id: reminder.id, message: reminder.message, remindAt: reminder.remindAt.toISOString(), emailedAt: reminder.emailedAt?.toISOString() || null }))}
    />
  </main>;
}
