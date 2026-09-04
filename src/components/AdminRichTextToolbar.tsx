"use client";

import { useEffect, useRef, useState } from "react";

export default function AdminRichTextToolbar() {
  const rangeRef = useRef<Range | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const [hasTarget, setHasTarget] = useState(false);

  useEffect(() => {
    const remember = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer instanceof HTMLElement
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
      const editor = container?.closest<HTMLElement>("[data-global-editable='true']") || null;
      if (editor) {
        editorRef.current = editor;
        rangeRef.current = range.cloneRange();
        setHasTarget(true);
      }
    };
    document.addEventListener("selectionchange", remember);
    document.addEventListener("focusin", remember);
    return () => {
      document.removeEventListener("selectionchange", remember);
      document.removeEventListener("focusin", remember);
    };
  }, []);

  const command = (name: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (selection && rangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(rangeRef.current);
    }
    document.execCommand(name, false, value);
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "formatBold" }));
  };

  const insertTable = () => {
    const rows = Math.min(10, Math.max(1, Number(prompt("Number of rows", "3")) || 0));
    if (!rows) return;
    const columns = Math.min(8, Math.max(1, Number(prompt("Number of columns", "3")) || 0));
    if (!columns) return;
    const row = `<tr>${Array.from({ length: columns }, () => "<td><br></td>").join("")}</tr>`;
    command("insertHTML", `<table><tbody>${Array.from({ length: rows }, () => row).join("")}</tbody></table><p><br></p>`);
  };

  return <div className="admin-rich-toolbar" aria-label="Page text formatting toolbar">
    <select aria-label="Font" defaultValue="Arial" disabled={!hasTarget} onChange={(event) => command("fontName", event.target.value)}>
      <option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Courier New</option>
    </select>
    <select aria-label="Size" defaultValue="3" disabled={!hasTarget} onChange={(event) => command("fontSize", event.target.value)}>
      <option value="1">Small</option><option value="3">Normal</option><option value="5">Large</option><option value="7">Extra large</option>
    </select>
    <button disabled={!hasTarget} title="Bold" onMouseDown={(event) => { event.preventDefault(); command("bold"); }}><strong>B</strong></button>
    <button disabled={!hasTarget} title="Italic" onMouseDown={(event) => { event.preventDefault(); command("italic"); }}><em>I</em></button>
    <button disabled={!hasTarget} title="Underline" onMouseDown={(event) => { event.preventDefault(); command("underline"); }}><u>U</u></button>
    <label>Text <input disabled={!hasTarget} type="color" defaultValue="#111827" onChange={(event) => command("foreColor", event.target.value)} /></label>
    <label>Highlight <input disabled={!hasTarget} type="color" defaultValue="#fff176" onChange={(event) => command("hiliteColor", event.target.value)} /></label>
    <button disabled={!hasTarget} onMouseDown={(event) => { event.preventDefault(); command("insertUnorderedList"); }}>Bullets</button>
    <button disabled={!hasTarget} onMouseDown={(event) => { event.preventDefault(); command("insertOrderedList"); }}>Numbering</button>
    <button disabled={!hasTarget} onMouseDown={(event) => { event.preventDefault(); insertTable(); }}>Table</button>
    <button disabled={!hasTarget} onMouseDown={(event) => { event.preventDefault(); command("removeFormat"); }}>Clear</button>
    {!hasTarget ? <span>Select page text to format it.</span> : null}
  </div>;
}
