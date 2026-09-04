"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DrawingStroke, NoteWorkspaceData, ReminderData, StickyNoteData } from "@/lib/note-types";

const COLORS = ["#fff3a6", "#ffd6e0", "#cdeffd", "#d9f7be", "#e8ddff", "#ffffff"];
const id = () => crypto.randomUUID();
const plainText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export default function NotesWorkspace({ initialWorkspace, initialReminders }: { initialWorkspace: NoteWorkspaceData; initialReminders: ReminderData[] }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedEditorId, setSelectedEditorId] = useState<string | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [reminders, setReminders] = useState(initialReminders);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [penEnabled, setPenEnabled] = useState(false);
  const [penColor, setPenColor] = useState("#111827");
  const [penWidth, setPenWidth] = useState(3);
  const [draftStroke, setDraftStroke] = useState<{ targetId: string; stroke: DrawingStroke } | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const skipFirstSave = useRef(true);
  const draftStrokeRef = useRef<{ targetId: string; stroke: DrawingStroke } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    noteId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    element: HTMLElement;
  } | null>(null);

  const activePage = workspace.pages.find((page) => page.id === workspace.activePageId) || workspace.pages[0];
  const pageEditorId = `page:${activePage.id}`;
  const selectedNoteId = selectedEditorId?.startsWith("page:") ? null : selectedEditorId;
  const activeIndex = workspace.pages.findIndex((page) => page.id === activePage.id);
  const archived = activePage.notes.filter((note) => note.archived);
  const topZ = Math.max(0, ...activePage.notes.map((note) => note.zIndex));

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
      if (container?.closest(`[data-note-editor="${CSS.escape(selectedEditorId)}"]`)) selectionRef.current = range.cloneRange();
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

  const addNote = () => {
    const note: StickyNoteData = { id: id(), html: "", x: 30 + (activePage.notes.length % 6) * 28, y: 30 + (activePage.notes.length % 5) * 28, width: 280, height: 220, color: COLORS[activePage.notes.length % COLORS.length], archived: false, zIndex: topZ + 1, strokes: [] };
    updatePage(activePage.id, (page) => ({ ...page, notes: [...page.notes, note] }));
    setSelectedEditorId(note.id);
  };

  const addPage = () => {
    const pageId = id();
    setWorkspace((current) => ({ ...current, activePageId: pageId, pages: [...current.pages, { id: pageId, title: `Page ${current.pages.length + 1}`, html: "", strokes: [], notes: [] }] }));
    setSelectedEditorId(`page:${pageId}`);
  };

  const removePage = () => {
    if (workspace.pages.length === 1) return;
    if (!confirm(`Delete “${activePage.title}” and all notes on it?`)) return;
    const pages = workspace.pages.filter((page) => page.id !== activePage.id);
    setWorkspace({ ...workspace, pages, activePageId: pages[Math.max(0, activeIndex - 1)].id });
    setSelectedEditorId(null);
  };

  const switchPage = (pageId: string) => {
    setWorkspace((current) => ({ ...current, activePageId: pageId }));
    setSelectedEditorId(null);
  };

  const commitEditor = (editorId: string) => {
    const editor = document.querySelector<HTMLElement>(`[data-note-editor="${CSS.escape(editorId)}"]`);
    if (!editor) return;
    const hasStructuredContent = Boolean(editor.querySelector("table, ul, ol"));
    const html = editor.innerText.trim() || hasStructuredContent ? editor.innerHTML : "";
    if (editorId.startsWith("page:")) {
      const pageId = editorId.slice(5);
      updatePage(pageId, (page) => ({ ...page, html }));
    } else {
      updateNote(editorId, { html });
    }
  };

  const runCommand = (command: string, value?: string) => {
    if (!selectedEditorId) return;
    const editor = document.querySelector<HTMLElement>(`[data-note-editor="${CSS.escape(selectedEditorId)}"]`);
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (selectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    }
    document.execCommand(command, false, value);
    commitEditor(selectedEditorId);
  };

  const insertTable = () => {
    const rows = Math.min(10, Math.max(1, Number(prompt("Number of rows", "3")) || 0));
    if (!rows) return;
    const columns = Math.min(8, Math.max(1, Number(prompt("Number of columns", "3")) || 0));
    if (!columns) return;
    const cells = `<tr>${Array.from({ length: columns }, () => "<td><br></td>").join("")}</tr>`;
    runCommand("insertHTML", `<table><tbody>${Array.from({ length: rows }, () => cells).join("")}</tbody></table><p><br></p>`);
  };

  const onBoardDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const noteId = event.dataTransfer.getData("application/x-lab-note");
    if (!noteId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    updateNote(noteId, {
      archived: false,
      x: Math.max(0, Math.min(1900, event.clientX - bounds.left - 40)),
      y: Math.max(0, Math.min(1300, event.clientY - bounds.top - 20)),
      zIndex: topZ + 1,
    });
  };

  const startNoteDrag = (event: React.PointerEvent<HTMLElement>, note: StickyNoteData) => {
    if (event.button !== 0) return;
    const element = event.currentTarget.closest<HTMLElement>(".sticky-note");
    if (!element) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      noteId: note.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: note.x,
      startY: note.y,
      element,
    };
    setSelectedEditorId(note.id);
    element.style.zIndex = String(topZ + 1);
  };

  const moveNoteDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const x = Math.max(0, Math.min(1_900, drag.startX + event.clientX - drag.startClientX));
    const y = Math.max(0, Math.min(1_300, drag.startY + event.clientY - drag.startClientY));
    drag.element.style.left = `${x}px`;
    drag.element.style.top = `${y}px`;
  };

  const finishNoteDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const overBin = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-notes-bin='true']");
    if (overBin) {
      updateNote(drag.noteId, { archived: true, zIndex: topZ + 1 });
      return;
    }
    updateNote(drag.noteId, {
      x: Number.parseFloat(drag.element.style.left) || 0,
      y: Number.parseFloat(drag.element.style.top) || 0,
      zIndex: topZ + 1,
    });
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
    if (targetId.startsWith("page:")) {
      updatePage(targetId.slice(5), (page) => ({ ...page, strokes: updater(page.strokes || []) }));
    } else {
      updatePage(activePage.id, (page) => ({
        ...page,
        notes: page.notes.map((note) => note.id === targetId ? { ...note, strokes: updater(note.strokes || []) } : note),
      }));
    }
  };

  const finishDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    const draft = draftStrokeRef.current;
    if (!draft) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    draftStrokeRef.current = null;
    setDraftStroke(null);
    updateStrokes(draft.targetId, (strokes) => [...strokes, draft.stroke]);
  };

  const strokePath = (stroke: DrawingStroke) => stroke.points
    .map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  const drawingLayer = (targetId: string, strokes: DrawingStroke[]) => {
    const rendered = draftStroke?.targetId === targetId ? [...strokes, draftStroke.stroke] : strokes;
    return <svg
      className={`notes-drawing-layer${penEnabled ? " pen-active" : ""}`}
      aria-label={penEnabled ? "Drawing surface" : undefined}
      onPointerDown={(event) => startDrawing(event, targetId)}
      onPointerMove={continueDrawing}
      onPointerUp={finishDrawing}
      onPointerCancel={finishDrawing}
    >
      {rendered.map((stroke) => <path key={stroke.id} d={strokePath(stroke)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>;
  };

  const undoDrawing = () => {
    if (selectedEditorId) updateStrokes(selectedEditorId, (strokes) => strokes.slice(0, -1));
  };

  const clearDrawing = () => {
    if (selectedEditorId && confirm("Clear all pen marks from the selected page or sticky note?")) {
      updateStrokes(selectedEditorId, () => []);
    }
  };

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return workspace.pages.flatMap((page) => {
      const pageContent = plainText(page.html || "");
      const pageMatches = `${page.title} ${pageContent}`.toLowerCase().includes(needle)
        ? [{ pageId: page.id, pageTitle: page.title, editorId: `page:${page.id}`, excerpt: pageContent.slice(0, 100) || "Page title" }]
        : [];
      const noteMatches = page.notes.flatMap((note) => {
        const content = plainText(note.html);
        return content.toLowerCase().includes(needle)
          ? [{ pageId: page.id, pageTitle: page.title, editorId: note.id, excerpt: content.slice(0, 100) || "Empty note" }]
          : [];
      });
      return [...pageMatches, ...noteMatches];
    });
  }, [query, workspace.pages]);

  const createReminder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReminderBusy(true);
    setReminderError(null);
    const form = new FormData(event.currentTarget);
    const localDate = String(form.get("remindAt") || "");
    try {
      const response = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: form.get("message"), remindAt: new Date(localDate).toISOString() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create reminder.");
      setReminders((current) => [...current, data.reminder].sort((a, b) => a.remindAt.localeCompare(b.remindAt)));
      event.currentTarget.reset();
    } catch (caught) { setReminderError(caught instanceof Error ? caught.message : "Could not create reminder."); }
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
          <button className="btn btn-muted" onClick={() => switchPage(workspace.pages[Math.max(0, activeIndex - 1)].id)} disabled={activeIndex === 0}>← Previous</button>
          <select value={activePage.id} onChange={(event) => switchPage(event.target.value)} aria-label="Current notes page">{workspace.pages.map((page, index) => <option key={page.id} value={page.id}>{index + 1}. {page.title}</option>)}</select>
          <button className="btn btn-muted" onClick={() => switchPage(workspace.pages[Math.min(workspace.pages.length - 1, activeIndex + 1)].id)} disabled={activeIndex === workspace.pages.length - 1}>Next →</button>
          <button className="btn btn-basic" onClick={addPage}>New Page</button>
          <button className="btn btn-warning" onClick={removePage} disabled={workspace.pages.length === 1}>Delete Page</button>
        </div>
        <span className={`notes-save-state ${saveState}`}>{saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"}</span>
      </div>

      <div className="notes-page-title-row">
        <input aria-label="Page title" value={activePage.title} maxLength={120} onChange={(event) => updatePage(activePage.id, (page) => ({ ...page, title: event.target.value }))} />
        <button className="btn btn-basic" onClick={addNote}>+ Add Sticky Note</button>
      </div>

      <div className="rich-toolbar" aria-label="Note formatting toolbar">
        <button className={penEnabled ? "pen-toggle active" : "pen-toggle"} aria-pressed={penEnabled} onClick={() => setPenEnabled((enabled) => !enabled)}>{penEnabled ? "Pen On" : "Pen"}</button>
        <label title="Pen color">Pen color <input type="color" value={penColor} onChange={(event) => setPenColor(event.target.value)} /></label>
        <select aria-label="Pen thickness" value={penWidth} onChange={(event) => setPenWidth(Number(event.target.value))}>
          <option value="1">Fine pen</option><option value="3">Medium pen</option><option value="6">Thick pen</option><option value="12">Marker</option>
        </select>
        <button disabled={!selectedEditorId} onClick={undoDrawing}>Undo Ink</button>
        <button disabled={!selectedEditorId} onClick={clearDrawing}>Clear Ink</button>
        <span className="toolbar-divider" aria-hidden="true" />
        <select aria-label="Font" defaultValue="Arial" onChange={(event) => runCommand("fontName", event.target.value)}>
          <option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Courier New</option>
        </select>
        <select aria-label="Text size" defaultValue="3" onChange={(event) => runCommand("fontSize", event.target.value)}>
          <option value="1">Small</option><option value="3">Normal</option><option value="5">Large</option><option value="7">Extra large</option>
        </select>
        <button title="Bold" onMouseDown={(event) => { event.preventDefault(); runCommand("bold"); }}><strong>B</strong></button>
        <button title="Italic" onMouseDown={(event) => { event.preventDefault(); runCommand("italic"); }}><em>I</em></button>
        <button title="Underline" onMouseDown={(event) => { event.preventDefault(); runCommand("underline"); }}><u>U</u></button>
        <label title="Text color">Text <input type="color" defaultValue="#111827" onChange={(event) => runCommand("foreColor", event.target.value)} /></label>
        <label title="Highlight color">Highlight <input type="color" defaultValue="#fff176" onChange={(event) => runCommand("hiliteColor", event.target.value)} /></label>
        <button onMouseDown={(event) => { event.preventDefault(); runCommand("insertUnorderedList"); }}>Bullets</button>
        <button onMouseDown={(event) => { event.preventDefault(); runCommand("insertOrderedList"); }}>Numbering</button>
        <button onMouseDown={(event) => { event.preventDefault(); insertTable(); }}>Insert Table</button>
        <button onMouseDown={(event) => { event.preventDefault(); runCommand("removeFormat"); }}>Clear Formatting</button>
        {!selectedEditorId ? <span className="muted">Click the page or a sticky note to format its text.</span> : null}
      </div>

      <div className="notes-board-scroll">
        <div className="notes-board" onDragOver={(event) => event.preventDefault()} onDrop={onBoardDrop}>
          <div
            key={pageEditorId}
            className={`notes-page-content${selectedEditorId === pageEditorId ? " selected" : ""}`}
            data-note-editor={pageEditorId}
            data-placeholder="Click anywhere on the page and start typing…"
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: activePage.html || "" }}
            onFocus={() => setSelectedEditorId(pageEditorId)}
            onBlur={() => commitEditor(pageEditorId)}
          />
          {drawingLayer(pageEditorId, activePage.strokes || [])}
          {activePage.notes.filter((note) => !note.archived).map((note) => <article
            key={note.id}
            className={`sticky-note${selectedNoteId === note.id ? " selected" : ""}`}
            style={{ left: note.x, top: note.y, width: note.width, height: note.height, background: note.color, zIndex: note.zIndex }}
            onMouseDown={() => { setSelectedEditorId(note.id); if (note.zIndex < topZ) updateNote(note.id, { zIndex: topZ + 1 }); }}
            onPointerUp={(event) => { const element = event.currentTarget; updateNote(note.id, { width: element.offsetWidth, height: element.offsetHeight }); }}
          >
            <div className={`sticky-note-header${expandedNoteIds.has(note.id) ? " expanded" : ""}`}>
              <span
                className="sticky-drag-handle"
                title="Drag to move"
                onPointerDown={(event) => startNoteDrag(event, note)}
                onPointerMove={moveNoteDrag}
                onPointerUp={finishNoteDrag}
                onPointerCancel={finishNoteDrag}
              >⋮⋮</span>
              <button className="note-control sticky-tools-toggle" aria-expanded={expandedNoteIds.has(note.id)} onClick={() => setExpandedNoteIds((current) => {
                const next = new Set(current);
                if (next.has(note.id)) next.delete(note.id); else next.add(note.id);
                return next;
              })}>{expandedNoteIds.has(note.id) ? "Hide tools" : "Tools"}</button>
              {expandedNoteIds.has(note.id) ? <div className="sticky-note-tools">
                <div className="sticky-color-picker">{COLORS.map((color) => <button key={color} aria-label={`Set note color ${color}`} title={color} style={{ "--note-swatch": color } as React.CSSProperties} onClick={() => updateNote(note.id, { color })} />)}</div>
                <button className="note-control" title="Move to saved notes bin" onClick={() => updateNote(note.id, { archived: true })}>Store in bin</button>
              </div> : null}
            </div>
            <div
              className="sticky-note-content"
              data-note-editor={note.id}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start typing…"
              dangerouslySetInnerHTML={{ __html: note.html === "Start typing…" ? "" : note.html }}
              onFocus={() => setSelectedEditorId(note.id)}
              onBlur={() => commitEditor(note.id)}
            />
            {drawingLayer(note.id, note.strokes || [])}
          </article>)}
        </div>
      </div>
    </section>

    <aside className="notes-sidebar">
      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Search Notes</h2>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all pages…" style={{ width: "100%", boxSizing: "border-box", padding: ".6rem" }} />
        {query ? <div className="notes-search-results">{matches.map((match) => <button key={`${match.pageId}-${match.editorId}`} className="notes-search-result" onClick={() => { switchPage(match.pageId); setSelectedEditorId(match.editorId); }}><strong>{match.pageTitle}</strong><span>{match.excerpt}</span></button>)}{!matches.length ? <p className="muted">No matches.</p> : null}</div> : null}
      </section>

      <section data-notes-bin="true" className="card notes-bin" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const noteId = event.dataTransfer.getData("application/x-lab-note"); if (noteId) updateNote(noteId, { archived: true }); }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Saved Notes Bin</h2>
        <p className="muted" style={{ fontSize: ".85rem" }}>Drag a sticky note here to store it for later.</p>
        {archived.map((note) => <div key={note.id} className="archived-note" style={{ borderLeftColor: note.color }} draggable onDragStart={(event) => event.dataTransfer.setData("application/x-lab-note", note.id)}>
          <span>{plainText(note.html).slice(0, 70) || "Empty note"}</span>
          <div><button className="note-control" onClick={() => updateNote(note.id, { archived: false })}>Restore</button><button className="note-control danger" onClick={() => { if (confirm("Permanently delete this saved note?")) updatePage(activePage.id, (page) => ({ ...page, notes: page.notes.filter((item) => item.id !== note.id) })); }}>Delete</button></div>
        </div>)}
        {!archived.length ? <p className="muted">The bin is empty.</p> : null}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Email Reminders</h2>
        <form onSubmit={createReminder} style={{ display: "grid", gap: ".65rem" }}>
          <textarea name="message" required rows={3} maxLength={2000} placeholder="What should the reminder say?" />
          <input name="remindAt" type="datetime-local" required />
          <button className="btn btn-basic" disabled={reminderBusy}>{reminderBusy ? "Scheduling…" : "Schedule Reminder"}</button>
        </form>
        {reminderError ? <p role="alert" style={{ color: "#b91c1c" }}>{reminderError}</p> : null}
        <div className="reminder-list">{reminders.map((reminder) => <div key={reminder.id} className="reminder-item"><strong>{reminder.message}</strong><small>{new Date(reminder.remindAt).toLocaleString()} · {reminder.emailedAt ? "Emailed" : "Pending"}</small><button className="note-control danger" onClick={() => removeReminder(reminder.id)}>Delete</button></div>)}</div>
      </section>
    </aside>
  </div>;
}
