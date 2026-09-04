export type StickyNoteData = {
  id: string;
  html: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  archived: boolean;
  zIndex: number;
};

export type NotePageData = {
  id: string;
  title: string;
  notes: StickyNoteData[];
};

export type NoteWorkspaceData = {
  version: 1;
  activePageId: string;
  pages: NotePageData[];
};

export type ReminderData = {
  id: string;
  message: string;
  remindAt: string;
  emailedAt: string | null;
};
