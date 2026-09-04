"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NoteWorkspaceData, ReminderData, StickyNoteData } from "@/lib/note-types";

const COLORS = ["#fff3a6", "#ffd6e0", "#cdeffd", "#d9f7be", "#e8ddff", "#ffffff"];
const id = () => crypto.randomUUID();
const plainText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export default function NotesWorkspace({ initialWorkspace, initialReminders }: { initialWorkspace: NoteWorkspaceData; initialReminders: ReminderData[] }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [reminders, setReminders] = useState(initialReminders);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const skipFirstSave = useRef(true);

  const activePage = workspace.pages.find((page) => page.id === workspace.activePageId) || workspace.pages[0];
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
      if (!selection?.rangeCount || !selectedNoteId) return;
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer instanceof HTMLElement
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
      if (container?.closest(`[data-note-editor="${CSS.escape(selectedNoteId)}"]`)) selectionRef.current = range.cloneRange();
    };
    document.addEventListener("selectionchange", rememberSelection);
    return () => document.removeEventListener("selectionchange", rememberSelection);
  }, [selectedNoteId]);

  const updatePage = (pageId: string, updater: (page: NoteWorkspaceData["pages"][number]) => NoteWorkspaceData["pages"][number]) => {
    setWorkspace((current) => ({ ...current, pages: current.pages.map((page) => page.id === pageId ? updater(page) : page) }));
  };

  const updateNote = (noteId: string, values: Partial<StickyNoteData>) => {
    updatePage(activePage.id, (page) => ({ ...page, notes: page.notes.map((note) => note.id === noteId ? { ...note, ...values } : note) }));
  };

  const addNote = () => {
    const note: StickyNoteData = { id: id(), html: "Start typing…", x: 30 + (activePage.notes.length % 6) * 28, y: 30 + (activePage.notes.length % 5) * 28, width: 280, height: 220, color: COLORS[activePage.notes.length % COLORS.length], archived: false, zIndex: topZ + 1 };
    updatePage(activePage.id, (page) => ({ ...page, notes: [...page.notes, note] }));
    setSelectedNoteId(note.id);
  };

  const addPage = () => {
    const pageId = id();
    setWorkspace((current) => ({ ...current, activePageId: pageId, pages: [...current.pages, { id: pageId, title: `Page ${current.pages.length + 1}`, notes: [] }] }));
    setSelectedNoteId(null);
  };

  const removePage = () => {
    if (workspace.pages.length === 1) return;
    if (!confirm(`Delete “${activePage.title}” and all notes on it?`)) return;
    const pages = workspace.pages.filter((page) => page.id !== activePage.id);
    setWorkspace({ ...workspace, pages, activePageId: pages[Math.max(0, activeIndex - 1)].id });
    setSelectedNoteId(null);
  };

  const switchPage = (pageId: string) => {
    setWorkspace((current) => ({ ...current, activePageId: pageId }));
    setSelectedNoteId(null);
  };

  const commitEditor = (noteId: string) => {
    const editor = document.querySelector<HTMLElement>(`[data-note-editor="${CSS.escape(noteId)}"]`);
    if (editor) updateNote(noteId, { html: editor.innerHTML });
  };

  const runCommand = (command: string, value?: string) => {
    if (!selectedNoteId) return;
    const editor = document.querySelector<HTMLElement>(`[data-note-editor="${CSS.escape(selectedNoteId)}"]`);
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (selectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    }
    document.execCommand(command, false, value);
    commitEditor(selectedNoteId);
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

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return workspace.pages.flatMap((page) => page.notes.flatMap((note) => {
      const content = plainText(note.html);
      return `${page.title} ${content}`.toLowerCase().includes(needle) ? [{ pageId: page.id, pageTitle: page.title, noteId: note.id, excerpt: content.slice(0, 100) || "Empty note" }] : [];
    }));
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
        {!selectedNoteId ? <span className="muted">Select a sticky note to format its text.</span> : null}
      </div>

      <div className="notes-board-scroll">
        <div className="notes-board" onDragOver={(event) => event.preventDefault()} onDrop={onBoardDrop}>
          {activePage.notes.filter((note) => !note.archived).map((note) => <article
            key={note.id}
            className={`sticky-note${selectedNoteId === note.id ? " selected" : ""}`}
            style={{ left: note.x, top: note.y, width: note.width, height: note.height, background: note.color, zIndex: note.zIndex }}
            onMouseDown={() => { setSelectedNoteId(note.id); if (note.zIndex < topZ) updateNote(note.id, { zIndex: topZ + 1 }); }}
            onPointerUp={(event) => { const element = event.currentTarget; updateNote(note.id, { width: element.offsetWidth, height: element.offsetHeight }); }}
          >
            <div className="sticky-note-header" draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-lab-note", note.id); event.dataTransfer.effectAllowed = "move"; }}>
              <span title="Drag to move">⋮⋮</span>
              <div className="sticky-color-picker">{COLORS.map((color) => <button key={color} aria-label={`Set note color ${color}`} style={{ background: color }} onMouseDown={(event) => event.stopPropagation()} onClick={() => updateNote(note.id, { color })} />)}</div>
              <button className="note-control" title="Move to saved notes bin" onClick={() => updateNote(note.id, { archived: true })}>Store</button>
            </div>
            <div
              className="sticky-note-content"
              data-note-editor={note.id}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: note.html }}
              onFocus={() => setSelectedNoteId(note.id)}
              onBlur={() => commitEditor(note.id)}
            />
          </article>)}
        </div>
      </div>
    </section>

    <aside className="notes-sidebar">
      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Search Notes</h2>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all pages…" style={{ width: "100%", boxSizing: "border-box", padding: ".6rem" }} />
        {query ? <div className="notes-search-results">{matches.map((match) => <button key={`${match.pageId}-${match.noteId}`} className="notes-search-result" onClick={() => { switchPage(match.pageId); setSelectedNoteId(match.noteId); }}><strong>{match.pageTitle}</strong><span>{match.excerpt}</span></button>)}{!matches.length ? <p className="muted">No matches.</p> : null}</div> : null}
      </section>

      <section className="card notes-bin" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const noteId = event.dataTransfer.getData("application/x-lab-note"); if (noteId) updateNote(noteId, { archived: true }); }}>
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
