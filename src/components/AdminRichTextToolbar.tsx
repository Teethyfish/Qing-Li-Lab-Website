"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export default function AdminRichTextToolbar() {
  const t = useTranslations('editorTools');
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
    const rows = Math.min(10, Math.max(1, Number(prompt(t('numberOfRows'), "3")) || 0));
    if (!rows) return;
    const columns = Math.min(8, Math.max(1, Number(prompt(t('numberOfColumns'), "3")) || 0));
    if (!columns) return;
    const row = `<tr>${Array.from({ length: columns }, () => "<td><br></td>").join("")}</tr>`;
    command("insertHTML", `<table><tbody>${Array.from({ length: rows }, () => row).join("")}</tbody></table><p><br></p>`);
  };

  return <div className="admin-rich-toolbar" aria-label={t('toolbarLabel')}>
    <select aria-label={t('font')} defaultValue="Arial" disabled={!hasTarget} onChange={(event) => command("fontName", event.target.value)}>
      <option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Courier New</option>
    </select>
    <select aria-label={t('size')} defaultValue="3" disabled={!hasTarget} onChange={(event) => command("fontSize", event.target.value)}>
      <option value="1">{t('small')}</option><option value="3">{t('normal')}</option><option value="5">{t('large')}</option><option value="7">{t('extraLarge')}</option>
    </select>
    <button disabled={!hasTarget} title={t('bold')} onMouseDown={(event) => { event.preventDefault(); command("bold"); }}><strong>B</strong></button>
    <button disabled={!hasTarget} title={t('italic')} onMouseDown={(event) => { event.preventDefault(); command("italic"); }}><em>I</em></button>
    <button disabled={!hasTarget} title={t('underline')} onMouseDown={(event) => { event.preventDefault(); command("underline"); }}><u>U</u></button>
    <label>{t('textColor')} <input disabled={!hasTarget} type="color" defaultValue="#111827" onChange={(event) => command("foreColor", event.target.value)} /></label>
    <label>{t('highlight')} <input disabled={!hasTarget} type="color" defaultValue="#fff176" onChange={(event) => command("hiliteColor", event.target.value)} /></label>
    <button disabled={!hasTarget} onMouseDown={(event) => { event.preventDefault(); command("insertUnorderedList"); }}>{t('bullets')}</button>
    <button disabled={!hasTarget} onMouseDown={(event) => { event.preventDefault(); command("insertOrderedList"); }}>{t('numbering')}</button>
    <button disabled={!hasTarget} onMouseDown={(event) => { event.preventDefault(); insertTable(); }}>{t('table')}</button>
    <button disabled={!hasTarget} onMouseDown={(event) => { event.preventDefault(); command("removeFormat"); }}>{t('clear')}</button>
    {!hasTarget ? <span>{t('selectText')}</span> : null}
  </div>;
}
