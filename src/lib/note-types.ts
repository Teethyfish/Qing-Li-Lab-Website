export type DrawingStroke = {
  id: string;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
};

export type StickyNoteData = {
  id: string;
  subject: string;
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

export type CanvasTextBoxData = {
  id: string;
  html: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type NotePageData = {
  id: string;
  title: string;
  html: string;
  strokes: DrawingStroke[];
  notes: StickyNoteData[];
  textBoxes: CanvasTextBoxData[];
};

export type RecentlyDeletedNoteItem = {
  id: string;
  kind: "note";
  pageId: string;
  deletedAt: string;
  item: StickyNoteData;
};

export type RecentlyDeletedTextBoxItem = {
  id: string;
  kind: "textbox";
  pageId: string;
  deletedAt: string;
  item: CanvasTextBoxData;
};

export type RecentlyDeletedItem = RecentlyDeletedNoteItem | RecentlyDeletedTextBoxItem;

export type NoteWorkspaceData = {
  version: 1;
  activePageId: string;
  pages: NotePageData[];
  recentlyDeleted: RecentlyDeletedItem[];
};

export type ReminderData = {
  id: string;
  message: string;
  remindAt: string;
  emailedAt: string | null;
};
