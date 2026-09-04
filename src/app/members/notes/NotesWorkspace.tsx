"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pencil, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CanvasTextBoxData, DrawingStroke, NoteWorkspaceData, RecentlyDeletedItem, ReminderData, StickyNoteData } from "@/lib/note-types";

const COLORS = ["#fff3a6", "#ffd6e0", "#cdeffd", "#d9f7be", "#e8ddff", "#ffffff"];
const id = () => crypto.randomUUID();
const plainText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

function editorHtml(editor: HTMLElement) {
  const hasStructuredContent = Boolean(editor.querySelector("table, ul, ol, img"));
  return editor.innerText.trim() || hasStructuredContent ? editor.innerHTML : "";
}

function PersistentRichEditor({
  editorId,
  html,
  className,
  placeholder,
  onFocus,
  onChange,
}: {
  editorId: string;
  html: string;
  className: string;
  placeholder: string;
  onFocus: () => void;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const loadedId = useRef("");

  useLayoutEffect(() => {
    const editor = ref.current;
    if (!editor) return;
    const changedEditor = loadedId.current !== editorId;
    const isFocused = editor === document.activeElement || editor.contains(document.activeElement);
    if (changedEditor || (!isFocused && editor.innerHTML !== html)) editor.innerHTML = html;
    loadedId.current = editorId;
  }, [editorId, html]);

  return <div
    ref={ref}
    className={className}
    data-note-editor={editorId}
    data-placeholder={placeholder}
    contentEditable
    suppressContentEditableWarning
    spellCheck
    onFocus={onFocus}
    onInput={(event) => onChange(editorHtml(event.currentTarget))}
    onBlur={(event) => onChange(editorHtml(event.currentTarget))}
  />;
}

export default function NotesWorkspace({ initialWorkspace, initialReminders }: { initialWorkspace: NoteWorkspaceData; initialReminders: ReminderData[] }) {
  const t = useTranslations("sitePages.notes");
  const hydratedWorkspace: NoteWorkspaceData = {
    ...initialWorkspace,
    recentlyDeleted: initialWorkspace.recentlyDeleted || [],
    pages: initialWorkspace.pages.map((page) => ({
      ...page,
      html: "",
      strokes: page.strokes || [],
      notes: (page.notes || []).map((note) => ({ ...note, subject: note.subject || "", strokes: note.strokes || [] })),
      textBoxes: [
        ...(page.textBoxes || []),
        ...(page.html && !(page.textBoxes || []).some((box) => box.id === `legacy-page-${page.id}`)
          ? [{ id: `legacy-page-${page.id}`, html: page.html, x: 32, y: 48, width: 520, height: 240, zIndex: 2 }]
          : []),
      ],
    })),
  };
  const [workspace, setWorkspace] = useState(hydratedWorkspace);
  const [selectedEditorId, setSelectedEditorId] = useState<string | null>(null);
  const [openNoteMenuId, setOpenNoteMenuId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState(false);
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [reminders, setReminders] = useState(initialReminders);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [penEnabled, setPenEnabled] = useState(false);
  const [penColor, setPenColor] = useState("#111827");
  const [penWidth, setPenWidth] = useState(3);
  const [boardSize, setBoardSize] = useState({ width: 1200, height: 760 });
  const [draftStroke, setDraftStroke] = useState<{ targetId: string; stroke: DrawingStroke } | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const selectedTableRef = useRef<HTMLTableElement | null>(null);
  const lastDrawingTargetRef = useRef<string | null>(null);
  const skipFirstSave = useRef(true);
  const draftStrokeRef = useRef<{ targetId: string; stroke: DrawingStroke } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    kind: "note" | "textbox";
    itemId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    element: HTMLElement;
  } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const activePage = workspace.pages.find((page) => page.id === workspace.activePageId) || workspace.pages[0];
  const pageEditorId = `page:${activePage.id}`;
  const selectedTextBoxId = selectedEditorId?.startsWith("textbox:") ? selectedEditorId.slice(8) : null;
  const selectedNoteId = selectedEditorId && !selectedEditorId.startsWith("page:") && !selectedEditorId.startsWith("textbox:") ? selectedEditorId : null;
  const activeIndex = workspace.pages.findIndex((page) => page.id === activePage.id);
  const archived = activePage.notes.filter((note) => note.archived);
  const recentlyDeleted = workspace.recentlyDeleted || [];
  const topZ = Math.max(2, ...activePage.notes.map((note) => note.zIndex), ...(activePage.textBoxes || []).map((box) => box.zIndex));

  const visibleRect = (item: { x: number; y: number; width: number; height: number }) => {
    const width = Math.min(item.width, boardSize.width);
    const height = Math.min(item.height, boardSize.height);
    return {
      x: Math.max(0, Math.min(item.x, Math.max(0, boardSize.width - width))),
      y: Math.max(0, Math.min(item.y, Math.max(0, boardSize.height - height))),
      width,
      height,
    };
  };

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => setBoardSize({ width: board.clientWidth, height: board.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (skipFirstSave.current) { skipFirstSave.current = false; return; }
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workspace),
        });
        if (!response.ok) throw new Error("save failed");
        setSaveState("saved");
      } catch { setSaveState("error"); }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  useEffect(() => {
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || !selectedEditorId) return;
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer instanceof HTMLElement
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
      const editor = container?.closest<HTMLElement>(`[data-note-editor="${CSS.escape(selectedEditorId)}"]`);
      if (!editor) return;
      selectionRef.current = range.cloneRange();
      selectedTableRef.current = container?.closest("table") || null;
      setSelectedTable(Boolean(selectedTableRef.current));
    };
    document.addEventListener("selectionchange", rememberSelection);
    return () => document.removeEventListener("selectionchange", rememberSelection);
  }, [selectedEditorId]);

  const updatePage = (pageId: string, updater: (page: NoteWorkspaceData["pages"][number]) => NoteWorkspaceData["pages"][number]) => {
    setWorkspace((current) => ({ ...current, pages: current.pages.map((page) => page.id === pageId ? updater(page) : page) }));
  };

  const updateNote = (noteId: string, values: Partial<StickyNoteData>) => {
    updatePage(activePage.id, (page) => ({ ...page, notes: page.notes.map((note) => note.id === noteId ? { ...note, ...values } : note) }));
  };

  const updateTextBox = (boxId: string, values: Partial<CanvasTextBoxData>) => {
    updatePage(activePage.id, (page) => ({ ...page, textBoxes: (page.textBoxes || []).map((box) => box.id === boxId ? { ...box, ...values } : box) }));
  };

  const restoreNote = (note: StickyNoteData) => {
    const bounds = visibleRect(note);
    updateNote(note.id, { archived: false, ...bounds, zIndex: topZ + 1 });
    setSelectedEditorId(note.id);
  };

  const commitItemBounds = (kind: "note" | "textbox", itemId: string, element: HTMLElement) => {
    const bounds = visibleRect({
      x: Number.parseFloat(element.style.left) || 0,
      y: Number.parseFloat(element.style.top) || 0,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });
    if (kind === "note") updateNote(itemId, bounds);
    else updateTextBox(itemId, bounds);
  };

  const updateEditorHtml = (editorId: string, html: string) => {
    if (editorId.startsWith("page:")) {
      updatePage(editorId.slice(5), (page) => page.html === html ? page : { ...page, html });
    } else if (editorId.startsWith("textbox:")) {
      updateTextBox(editorId.slice(8), { html });
    } else {
      updateNote(editorId, { html });
    }
  };

  const addNote = () => {
    const note: StickyNoteData = { id: id(), subject: "", html: "", x: 30 + (activePage.notes.length % 6) * 28, y: 30 + (activePage.notes.length % 5) * 28, width: 280, height: 220, color: COLORS[activePage.notes.length % COLORS.length], archived: false, zIndex: topZ + 1, strokes: [] };
    updatePage(activePage.id, (page) => ({ ...page, notes: [...page.notes, note] }));
    setSelectedEditorId(note.id);
  };

  const addTextBox = (x: number, y: number) => {
    const width = Math.min(360, boardSize.width);
    const height = Math.min(140, boardSize.height);
    const bounds = visibleRect({ x, y, width, height });
    const box: CanvasTextBoxData = { id: id(), html: "", ...bounds, zIndex: topZ + 1 };
    updatePage(activePage.id, (page) => ({ ...page, textBoxes: [...(page.textBoxes || []), box] }));
    setSelectedEditorId(`textbox:${box.id}`);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-note-editor="textbox:${CSS.escape(box.id)}"]`)?.focus());
  };

  const addTextBoxFromBoard = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || penEnabled || event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    addTextBox(event.clientX - bounds.left, event.clientY - bounds.top);
  };

  const deleteNote = (note: StickyNoteData) => {
    const deleted: RecentlyDeletedItem = { id: id(), kind: "note", pageId: activePage.id, deletedAt: new Date().toISOString(), item: note };
    setWorkspace((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === activePage.id ? { ...page, notes: page.notes.filter((item) => item.id !== note.id) } : page),
      recentlyDeleted: [deleted, ...(current.recentlyDeleted || [])].slice(0, 5),
    }));
    if (selectedEditorId === note.id) setSelectedEditorId(null);
  };

  const deleteTextBox = (box: CanvasTextBoxData) => {
    const deleted: RecentlyDeletedItem = { id: id(), kind: "textbox", pageId: activePage.id, deletedAt: new Date().toISOString(), item: box };
    setWorkspace((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === activePage.id ? { ...page, textBoxes: (page.textBoxes || []).filter((item) => item.id !== box.id) } : page),
      recentlyDeleted: [deleted, ...(current.recentlyDeleted || [])].slice(0, 5),
    }));
    if (selectedEditorId === `textbox:${box.id}`) setSelectedEditorId(null);
  };

  const restoreDeleted = (deleted: RecentlyDeletedItem) => {
    const targetPageId = workspace.pages.some((page) => page.id === deleted.pageId) ? deleted.pageId : activePage.id;
    const bounds = visibleRect(deleted.item);
    setWorkspace((current) => ({
      ...current,
      activePageId: targetPageId,
      pages: current.pages.map((page) => {
        if (page.id !== targetPageId) return page;
        const restoredZ = Math.max(2, ...page.notes.map((item) => item.zIndex), ...(page.textBoxes || []).map((item) => item.zIndex)) + 1;
        if (deleted.kind === "note") return { ...page, notes: [...page.notes.filter((item) => item.id !== deleted.item.id), { ...deleted.item, ...bounds, archived: false, zIndex: restoredZ }] };
        return { ...page, textBoxes: [...(page.textBoxes || []).filter((item) => item.id !== deleted.item.id), { ...deleted.item, ...bounds, zIndex: restoredZ }] };
      }),
      recentlyDeleted: (current.recentlyDeleted || []).filter((item) => item.id !== deleted.id),
    }));
    setSelectedEditorId(deleted.kind === "note" ? deleted.item.id : `textbox:${deleted.item.id}`);
  };

  const addPage = () => {
    const pageId = id();
    setWorkspace((current) => ({ ...current, activePageId: pageId, pages: [...current.pages, { id: pageId, title: t("page", { number: current.pages.length + 1 }), html: "", strokes: [], notes: [], textBoxes: [] }] }));
    setSelectedEditorId(`page:${pageId}`);
  };

  const removePage = () => {
    if (workspace.pages.length === 1 || !confirm(t("deletePageConfirm", { title: activePage.title }))) return;
    const pages = workspace.pages.filter((page) => page.id !== activePage.id);
    setWorkspace({ ...workspace, pages, activePageId: pages[Math.max(0, activeIndex - 1)].id });
    setSelectedEditorId(null);
  };

  const switchPage = (pageId: string) => {
    setWorkspace((current) => ({ ...current, activePageId: pageId }));
    setSelectedEditorId(null);
    lastDrawingTargetRef.current = null;
    selectedTableRef.current = null;
    setSelectedTable(false);
  };

  const getSelectedEditor = () => selectedEditorId
    ? document.querySelector<HTMLElement>(`[data-note-editor="${CSS.escape(selectedEditorId)}"]`)
    : null;

  const restoreSelection = (editor: HTMLElement) => {
    editor.focus();
    const selection = window.getSelection();
    const remembered = selectionRef.current;
    const rememberedContainer = remembered?.commonAncestorContainer instanceof HTMLElement
      ? remembered.commonAncestorContainer
      : remembered?.commonAncestorContainer.parentElement;
    if (selection && remembered && remembered.commonAncestorContainer.isConnected && rememberedContainer && editor.contains(rememberedContainer)) {
      selection.removeAllRanges();
      selection.addRange(remembered);
    } else if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return selection;
  };

  const syncSelectedEditor = () => {
    const editor = getSelectedEditor();
    if (editor && selectedEditorId) updateEditorHtml(selectedEditorId, editorHtml(editor));
  };

  const runCommand = (command: string, value?: string) => {
    const editor = getSelectedEditor();
    if (!editor) return;
    setPenEnabled(false);
    restoreSelection(editor);
    document.execCommand(command, false, value);
    syncSelectedEditor();
  };

  const clearFormatting = () => {
    const editor = getSelectedEditor();
    if (!editor) return;
    setPenEnabled(false);
    const selection = restoreSelection(editor);
    if (!selection) return;
    const clearWholeEditor = !selection.rangeCount || selection.getRangeAt(0).collapsed;
    if (clearWholeEditor) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const affectedRange = selection.getRangeAt(0).cloneRange();
    document.execCommand("removeFormat", false);
    document.execCommand("unlink", false);
    editor.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
      try { if (clearWholeEditor || affectedRange.intersectsNode(element)) element.removeAttribute("style"); } catch { /* detached by removeFormat */ }
    });
    editor.querySelectorAll("font").forEach((element) => {
      try { if (clearWholeEditor || affectedRange.intersectsNode(element)) element.replaceWith(...Array.from(element.childNodes)); } catch { /* detached by removeFormat */ }
    });
    syncSelectedEditor();
  };

  const applyBlockSpacing = (property: "lineHeight" | "marginBottom", value: string) => {
    const editor = getSelectedEditor();
    if (!editor) return;
    setPenEnabled(false);
    const selection = restoreSelection(editor);
    if (!selection?.rangeCount) return;
    const initialBlock = selection.anchorNode instanceof HTMLElement
      ? selection.anchorNode.closest<HTMLElement>("p, div, li, td, th")
      : selection.anchorNode?.parentElement?.closest<HTMLElement>("p, div, li, td, th");
    if (selection.getRangeAt(0).collapsed && (!initialBlock || initialBlock === editor)) document.execCommand("formatBlock", false, "p");
    const range = selection.getRangeAt(0);
    const blocks = Array.from(editor.querySelectorAll<HTMLElement>("p, div, li, td, th")).filter((block) => {
      try { return range.intersectsNode(block); } catch { return false; }
    });
    const closest = selection.anchorNode instanceof HTMLElement ? selection.anchorNode.closest<HTMLElement>("p, div, li, td, th") : selection.anchorNode?.parentElement?.closest<HTMLElement>("p, div, li, td, th");
    const targets = blocks.length ? blocks : closest && closest !== editor && editor.contains(closest) ? [closest] : [];
    targets.forEach((block) => { block.style[property] = value; });
    syncSelectedEditor();
  };

  const insertTable = () => {
    const rows = Math.min(10, Math.max(1, Number(prompt(t("tableRows"), "3")) || 0));
    if (!rows) return;
    const columns = Math.min(8, Math.max(1, Number(prompt(t("tableColumns"), "3")) || 0));
    if (!columns) return;
    const cells = `<tr>${Array.from({ length: columns }, () => "<td><br></td>").join("")}</tr>`;
    runCommand("insertHTML", `<table><tbody>${Array.from({ length: rows }, () => cells).join("")}</tbody></table><p><br></p>`);
  };

  const moveTable = (direction: "up" | "down") => {
    const table = selectedTableRef.current;
    if (!table?.parentElement) return;
    if (direction === "up" && table.previousElementSibling) table.parentElement.insertBefore(table, table.previousElementSibling);
    if (direction === "down" && table.nextElementSibling) table.parentElement.insertBefore(table.nextElementSibling, table);
    syncSelectedEditor();
  };

  const deleteTable = () => {
    const table = selectedTableRef.current;
    if (!table) return;
    table.remove();
    selectedTableRef.current = null;
    setSelectedTable(false);
    syncSelectedEditor();
  };

  const startItemDrag = (event: React.PointerEvent<HTMLElement>, kind: "note" | "textbox", item: { id: string; x: number; y: number }) => {
    if (event.button !== 0) return;
    const element = event.currentTarget.closest<HTMLElement>(kind === "note" ? ".sticky-note" : ".canvas-text-box");
    if (!element) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, kind, itemId: item.id, startClientX: event.clientX, startClientY: event.clientY, startX: item.x, startY: item.y, element };
    setSelectedEditorId(kind === "note" ? item.id : `textbox:${item.id}`);
    element.style.zIndex = String(topZ + 1);
  };

  const moveItemDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const board = boardRef.current;
    const maxX = Math.max(0, (board?.clientWidth || boardSize.width) - drag.element.offsetWidth);
    const maxY = Math.max(0, (board?.clientHeight || boardSize.height) - drag.element.offsetHeight);
    drag.element.style.left = `${Math.max(0, Math.min(maxX, drag.startX + event.clientX - drag.startClientX))}px`;
    drag.element.style.top = `${Math.max(0, Math.min(maxY, drag.startY + event.clientY - drag.startClientY))}px`;
  };

  const finishItemDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const x = Number.parseFloat(drag.element.style.left) || 0;
    const y = Number.parseFloat(drag.element.style.top) || 0;
    if (drag.kind === "note") {
      const overBin = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-notes-bin='true']");
      updateNote(drag.itemId, { x, y, zIndex: topZ + 1, ...(overBin ? { archived: true } : {}) });
    } else updateTextBox(drag.itemId, { x, y, zIndex: topZ + 1 });
  };

  const onBoardDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const noteId = event.dataTransfer.getData("application/x-lab-note");
    if (!noteId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const note = activePage.notes.find((item) => item.id === noteId);
    const width = Math.min(note?.width || 280, bounds.width);
    const height = Math.min(note?.height || 220, bounds.height);
    updateNote(noteId, { archived: false, x: Math.max(0, Math.min(bounds.width - width, event.clientX - bounds.left - 40)), y: Math.max(0, Math.min(bounds.height - height, event.clientY - bounds.top - 20)), width, height, zIndex: topZ + 1 });
  };

  const pointIn = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const startDrawing = (event: React.PointerEvent<SVGSVGElement>, targetId: string) => {
    if (!penEnabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const draft = { targetId, stroke: { id: id(), color: penColor, width: penWidth, points: [pointIn(event)] } };
    draftStrokeRef.current = draft;
    lastDrawingTargetRef.current = targetId;
    setDraftStroke(draft);
    setSelectedEditorId(targetId);
  };

  const continueDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    const draft = draftStrokeRef.current;
    if (!draft || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    const point = pointIn(event);
    const previous = draft.stroke.points[draft.stroke.points.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1.5) return;
    const next = { ...draft, stroke: { ...draft.stroke, points: [...draft.stroke.points, point] } };
    draftStrokeRef.current = next;
    setDraftStroke(next);
  };

  const updateStrokes = (targetId: string, updater: (strokes: DrawingStroke[]) => DrawingStroke[]) => {
    if (targetId.startsWith("page:")) updatePage(targetId.slice(5), (page) => ({ ...page, strokes: updater(page.strokes || []) }));
    else updatePage(activePage.id, (page) => ({ ...page, notes: page.notes.map((note) => note.id === targetId ? { ...note, strokes: updater(note.strokes || []) } : note) }));
  };

  const finishDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    const draft = draftStrokeRef.current;
    if (!draft) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    draftStrokeRef.current = null;
    setDraftStroke(null);
    updateStrokes(draft.targetId, (strokes) => [...strokes, draft.stroke]);
  };

  const strokePath = (stroke: DrawingStroke) => stroke.points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const drawingLayer = (targetId: string, strokes: DrawingStroke[]) => {
    const rendered = draftStroke?.targetId === targetId ? [...strokes, draftStroke.stroke] : strokes;
    return <svg className={`notes-drawing-layer${penEnabled ? " pen-active" : ""}`} aria-label={penEnabled ? t("penOn") : undefined} onPointerDown={(event) => startDrawing(event, targetId)} onPointerMove={continueDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing}>
      {rendered.map((stroke) => <path key={stroke.id} d={strokePath(stroke)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>;
  };

  const drawingTarget = lastDrawingTargetRef.current || (selectedEditorId && !selectedEditorId.startsWith("textbox:") ? selectedEditorId : pageEditorId);
  const undoDrawing = () => updateStrokes(drawingTarget, (strokes) => strokes.slice(0, -1));
  const clearDrawing = () => updateStrokes(drawingTarget, () => []);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return workspace.pages.flatMap((page) => {
      const pageContent = plainText(page.html || "");
      const pageMatches = `${page.title} ${pageContent}`.toLowerCase().includes(needle) ? [{ pageId: page.id, pageTitle: page.title, editorId: `page:${page.id}`, excerpt: pageContent.slice(0, 100) || t("pageTitle") }] : [];
      const noteMatches = page.notes.flatMap((note) => {
        const content = plainText(note.html);
        return `${note.subject || ""} ${content}`.toLowerCase().includes(needle) ? [{ pageId: page.id, pageTitle: page.title, editorId: note.id, excerpt: note.subject || content.slice(0, 100) || t("emptyNote") }] : [];
      });
      const boxMatches = (page.textBoxes || []).flatMap((box) => {
        const content = plainText(box.html);
        return content.toLowerCase().includes(needle) ? [{ pageId: page.id, pageTitle: page.title, editorId: `textbox:${box.id}`, excerpt: content.slice(0, 100) }] : [];
      });
      return [...pageMatches, ...noteMatches, ...boxMatches];
    });
  }, [query, t, workspace.pages]);

  const createReminder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReminderBusy(true);
    setReminderError(null);
    const form = new FormData(event.currentTarget);
    const localDate = String(form.get("remindAt") || "");
    try {
      const response = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: form.get("message"), remindAt: new Date(localDate).toISOString() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("reminderError"));
      setReminders((current) => [...current, data.reminder].sort((a, b) => a.remindAt.localeCompare(b.remindAt)));
      event.currentTarget.reset();
    } catch (caught) { setReminderError(caught instanceof Error ? caught.message : t("reminderError")); }
    finally { setReminderBusy(false); }
  };

  const removeReminder = async (reminderId: string) => {
    const response = await fetch(`/api/reminders?id=${encodeURIComponent(reminderId)}`, { method: "DELETE" });
    if (response.ok) setReminders((current) => current.filter((reminder) => reminder.id !== reminderId));
  };

  return <div data-edit-ignore="true" className="notes-layout">
    <section className="notes-main">
      <div className="notes-topbar">
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-muted" onClick={() => switchPage(workspace.pages[Math.max(0, activeIndex - 1)].id)} disabled={activeIndex === 0}>{t("previous")}</button>
          <select value={activePage.id} onChange={(event) => switchPage(event.target.value)} aria-label={t("pageTitle")}>{workspace.pages.map((page, index) => <option key={page.id} value={page.id}>{index + 1}. {page.title}</option>)}</select>
          <button className="btn btn-muted" onClick={() => switchPage(workspace.pages[Math.min(workspace.pages.length - 1, activeIndex + 1)].id)} disabled={activeIndex === workspace.pages.length - 1}>{t("next")}</button>
          <button className="btn btn-basic" onClick={addPage}>{t("newPage")}</button>
          <button className="btn btn-warning" onClick={removePage} disabled={workspace.pages.length === 1}>{t("deletePage")}</button>
        </div>
        <span className={`notes-save-state ${saveState}`}>{saveState === "saving" ? t("saving") : saveState === "error" ? t("saveFailed") : t("saved")}</span>
      </div>

      <div className="notes-page-title-row">
        <input aria-label={t("pageTitle")} value={activePage.title} maxLength={120} onChange={(event) => updatePage(activePage.id, (page) => ({ ...page, title: event.target.value }))} />
        <button className="btn btn-basic" onClick={addNote}>{t("addSticky")}</button>
      </div>

      <div className="rich-toolbar" aria-label={t("formattingToolbar")}>
        <button className={penEnabled ? "pen-toggle active" : "pen-toggle"} aria-pressed={penEnabled} onClick={() => setPenEnabled((enabled) => !enabled)}>{penEnabled ? t("penOn") : t("pen")}</button>
        <label title={t("penColor")}>{t("penColor")} <input type="color" value={penColor} onChange={(event) => setPenColor(event.target.value)} /></label>
        <select aria-label={t("penThickness")} value={penWidth} onChange={(event) => setPenWidth(Number(event.target.value))}><option value="1">{t("finePen")}</option><option value="3">{t("mediumPen")}</option><option value="6">{t("thickPen")}</option><option value="12">{t("marker")}</option></select>
        <button onClick={undoDrawing}>{t("undoInk")}</button>
        <button onClick={clearDrawing}>{t("clearInk")}</button>
        <span className="toolbar-divider" aria-hidden="true" />
        <select aria-label={t("font")} defaultValue="Arial" onChange={(event) => runCommand("fontName", event.target.value)}><option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Courier New</option></select>
        <select aria-label={t("textSize")} defaultValue="3" onChange={(event) => runCommand("fontSize", event.target.value)}><option value="1">{t("small")}</option><option value="3">{t("normal")}</option><option value="5">{t("large")}</option><option value="7">{t("extraLarge")}</option></select>
        <select aria-label={t("lineSpacing")} defaultValue="1.5" onChange={(event) => applyBlockSpacing("lineHeight", event.target.value)}><option value="1">{t("spacingSingle")}</option><option value="1.15">1.15</option><option value="1.5">1.5</option><option value="2">{t("spacingDouble")}</option></select>
        <select aria-label={t("paragraphSpacing")} defaultValue="0.5rem" onChange={(event) => applyBlockSpacing("marginBottom", event.target.value)}><option value="0">{t("spacingNone")}</option><option value="0.5rem">{t("spacingCompact")}</option><option value="1rem">{t("spacingNormal")}</option><option value="1.5rem">{t("spacingWide")}</option></select>
        <button title={t("bold")} onMouseDown={(event) => { event.preventDefault(); runCommand("bold"); }}><strong>B</strong></button>
        <button title={t("italic")} onMouseDown={(event) => { event.preventDefault(); runCommand("italic"); }}><em>I</em></button>
        <button title={t("underline")} onMouseDown={(event) => { event.preventDefault(); runCommand("underline"); }}><u>U</u></button>
        <label>{t("text")} <input type="color" defaultValue="#111827" onChange={(event) => runCommand("foreColor", event.target.value)} /></label>
        <label>{t("highlight")} <input type="color" defaultValue="#fff176" onChange={(event) => runCommand("hiliteColor", event.target.value)} /></label>
        <button onMouseDown={(event) => { event.preventDefault(); runCommand("insertUnorderedList"); }}>{t("bullets")}</button>
        <button onMouseDown={(event) => { event.preventDefault(); runCommand("insertOrderedList"); }}>{t("numbering")}</button>
        <button onMouseDown={(event) => { event.preventDefault(); insertTable(); }}>{t("insertTable")}</button>
        {selectedTable ? <><button onMouseDown={(event) => { event.preventDefault(); moveTable("up"); }}>{t("moveTableUp")}</button><button onMouseDown={(event) => { event.preventDefault(); moveTable("down"); }}>{t("moveTableDown")}</button><button onMouseDown={(event) => { event.preventDefault(); deleteTable(); }}>{t("deleteTable")}</button></> : null}
        <button onMouseDown={(event) => { event.preventDefault(); clearFormatting(); }}>{t("clearFormatting")}</button>
        {!selectedEditorId ? <span className="muted">{t("formatHint")}</span> : null}
      </div>

      <div className="notes-board-scroll">
        <div ref={boardRef} className="notes-board" onPointerDown={addTextBoxFromBoard} onDragOver={(event) => event.preventDefault()} onDrop={onBoardDrop}>
          {!(activePage.textBoxes || []).length ? <div className="notes-page-click-hint">{t("pagePlaceholder")}</div> : null}
          {drawingLayer(pageEditorId, activePage.strokes || [])}

          {(activePage.textBoxes || []).map((box) => {
            const bounds = visibleRect(box);
            return <article key={box.id} className={`canvas-text-box${selectedTextBoxId === box.id ? " selected" : ""}`} style={{ ...bounds, zIndex: box.zIndex }} onMouseDown={() => { setSelectedEditorId(`textbox:${box.id}`); if (box.zIndex < topZ) updateTextBox(box.id, { zIndex: topZ + 1 }); }} onPointerUp={(event) => commitItemBounds("textbox", box.id, event.currentTarget)}>
              <div className="canvas-text-box-controls">
                <button className="canvas-text-drag" aria-label={t("dragToMove")} title={t("dragToMove")} onPointerDown={(event) => startItemDrag(event, "textbox", { ...box, ...bounds })} onPointerMove={moveItemDrag} onPointerUp={finishItemDrag} onPointerCancel={finishItemDrag}>⋮⋮</button>
                <button className="canvas-item-delete" aria-label={t("deleteTextBox")} title={t("deleteTextBox")} onClick={(event) => { event.stopPropagation(); deleteTextBox(box); }}><X size={12} /></button>
              </div>
              <PersistentRichEditor editorId={`textbox:${box.id}`} html={box.html} className="canvas-text-box-content" placeholder={t("textBoxPlaceholder")} onFocus={() => setSelectedEditorId(`textbox:${box.id}`)} onChange={(html) => updateEditorHtml(`textbox:${box.id}`, html)} />
            </article>;
          })}

          {activePage.notes.filter((note) => !note.archived).map((note) => {
            const bounds = visibleRect(note);
            return <article key={note.id} className={`sticky-note${selectedNoteId === note.id ? " selected" : ""}`} style={{ ...bounds, background: note.color, zIndex: note.zIndex }} onMouseDown={() => { setSelectedEditorId(note.id); if (note.zIndex < topZ) updateNote(note.id, { zIndex: topZ + 1 }); }} onPointerUp={(event) => commitItemBounds("note", note.id, event.currentTarget)}>
              <div className="sticky-note-header">
                <span className="sticky-drag-handle" title={t("dragToMove")} onPointerDown={(event) => startItemDrag(event, "note", { ...note, ...bounds })} onPointerMove={moveItemDrag} onPointerUp={finishItemDrag} onPointerCancel={finishItemDrag}>⋮⋮</span>
                <input className="sticky-note-subject" value={note.subject || ""} maxLength={120} placeholder={t("subject")} aria-label={t("subject")} onChange={(event) => updateNote(note.id, { subject: event.target.value })} />
                <button className="sticky-edit-toggle" aria-label={t("editSticky")} title={t("editSticky")} aria-expanded={openNoteMenuId === note.id} onClick={() => setOpenNoteMenuId((current) => current === note.id ? null : note.id)}><Pencil size={12} /></button>
                {openNoteMenuId === note.id ? <div className="sticky-note-popover" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="sticky-color-picker">{COLORS.map((color) => <button key={color} aria-label={t("setNoteColor")} title={color} style={{ "--note-swatch": color } as React.CSSProperties} onClick={() => updateNote(note.id, { color })} />)}</div>
                  <button className="note-control" onClick={() => { updateNote(note.id, { archived: true }); setOpenNoteMenuId(null); }}>{t("storeInBin")}</button>
                  <button className="note-control danger" onClick={() => { deleteNote(note); setOpenNoteMenuId(null); }}>{t("delete")}</button>
                </div> : null}
              </div>
              <PersistentRichEditor editorId={note.id} html={note.html === "Start typing…" ? "" : note.html} className="sticky-note-content" placeholder={t("notePlaceholder")} onFocus={() => setSelectedEditorId(note.id)} onChange={(html) => updateEditorHtml(note.id, html)} />
              {drawingLayer(note.id, note.strokes || [])}
            </article>;
          })}
        </div>
      </div>
    </section>

    <aside className="notes-sidebar">
      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{t("search")}</h2>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} style={{ width: "100%", boxSizing: "border-box", padding: ".6rem" }} />
        {query ? <div className="notes-search-results">{matches.map((match) => <button key={`${match.pageId}-${match.editorId}`} className="notes-search-result" onClick={() => { switchPage(match.pageId); setSelectedEditorId(match.editorId); }}><strong>{match.pageTitle}</strong><span>{match.excerpt}</span></button>)}{!matches.length ? <p className="muted">{t("noMatches")}</p> : null}</div> : null}
      </section>

      <section data-notes-bin="true" className="card notes-bin" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const noteId = event.dataTransfer.getData("application/x-lab-note"); if (noteId) updateNote(noteId, { archived: true }); }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{t("bin")}</h2>
        <p className="muted" style={{ fontSize: ".85rem" }}>{t("binHelp")}</p>
        <div className="archived-notes-grid">{archived.map((note) => <div key={note.id} className="archived-note" style={{ background: note.color }} draggable onDragStart={(event) => event.dataTransfer.setData("application/x-lab-note", note.id)}>
          <strong>{note.subject || t("untitledNote")}</strong>
          <span className="archived-note-actions">
            <button className="archived-note-icon restore" aria-label={t("restore")} title={t("restore")} onClick={() => restoreNote(note)}><RotateCcw size={12} aria-hidden="true" /></button>
            <button className="archived-note-icon delete" aria-label={t("delete")} title={t("delete")} onClick={() => deleteNote(note)}><X size={12} aria-hidden="true" /></button>
          </span>
        </div>)}</div>
        {!archived.length ? <p className="muted">{t("emptyBin")}</p> : null}
      </section>

      <section className="card recently-deleted">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{t("recentlyDeleted")}</h2>
        <p className="muted" style={{ fontSize: ".85rem" }}>{t("recentlyDeletedHelp")}</p>
        <div className="recently-deleted-list">{recentlyDeleted.map((deleted) => {
          const label = deleted.kind === "note"
            ? deleted.item.subject || plainText(deleted.item.html).slice(0, 45) || t("untitledNote")
            : plainText(deleted.item.html).slice(0, 45) || t("untitledTextBlock");
          return <div key={deleted.id} className="recently-deleted-item">
            <span><strong>{label}</strong><small>{deleted.kind === "note" ? t("stickyNote") : t("textBlock")} · {new Date(deleted.deletedAt).toLocaleString()}</small></span>
            <button className="recently-deleted-restore" aria-label={t("restore")} title={t("restore")} onClick={() => restoreDeleted(deleted)}><RotateCcw size={14} aria-hidden="true" /></button>
          </div>;
        })}</div>
        {!recentlyDeleted.length ? <p className="muted">{t("nothingRecentlyDeleted")}</p> : null}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{t("reminders")}</h2>
        <form onSubmit={createReminder} style={{ display: "grid", gap: ".65rem" }}><textarea name="message" required rows={3} maxLength={2000} placeholder={t("reminderPlaceholder")} /><input name="remindAt" type="datetime-local" required /><button className="btn btn-basic" disabled={reminderBusy}>{reminderBusy ? t("scheduling") : t("schedule")}</button></form>
        {reminderError ? <p role="alert" style={{ color: "#b91c1c" }}>{reminderError}</p> : null}
        <div className="reminder-list">{reminders.map((reminder) => <div key={reminder.id} className="reminder-item"><strong>{reminder.message}</strong><small>{new Date(reminder.remindAt).toLocaleString()} · {reminder.emailedAt ? t("emailed") : t("pending")}</small><button className="note-control danger" onClick={() => removeReminder(reminder.id)}>{t("delete")}</button></div>)}</div>
      </section>
    </aside>
  </div>;
}
