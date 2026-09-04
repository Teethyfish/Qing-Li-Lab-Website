export type DrawingStroke = {
  id: string;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
};

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
  strokes: DrawingStroke[];
};

export type NotePageData = {
  id: string;
  title: string;
  html: string;
  strokes: DrawingStroke[];
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
