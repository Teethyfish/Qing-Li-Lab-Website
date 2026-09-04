"use client";

import { FormEvent, useState } from "react";

type Props = {
  documentId: string;
  labels: {
    file: string;
    replace: string;
    replacing: string;
    success: string;
    chooseFile: string;
    failed: string;
  };
};

export default function ReplaceDocumentFileForm({ documentId, labels }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("replacement");
    if (!(file instanceof File) || !file.size) return setStatus(labels.chooseFile);

    setBusy(true);
    setStatus(labels.replacing);
    try {
      const startResponse = await fetch("/api/documents/upload/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      const start = await startResponse.json();
      if (!startResponse.ok) throw new Error(start.error || labels.failed);

      const chunkSize = 2 * 1024 * 1024;
      let offset = 0;
      let driveFileId = "";
      while (offset < file.size) {
        const end = Math.min(offset + chunkSize, file.size);
        const response = await fetch("/api/documents/upload/chunk", {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
            "X-Drive-Upload-Url": start.sessionUrl,
          },
          body: file.slice(offset, end),
        });
        const result = await response.json().catch(() => null) as { complete?: boolean; id?: string; nextOffset?: number; error?: string } | null;
        if (!response.ok || !result) throw new Error(result?.error || labels.failed);
        if (result.complete && result.id) {
          driveFileId = result.id;
          offset = file.size;
        } else {
          offset = result.nextOffset ?? end;
        }
      }

      const finishResponse = await fetch(`/api/documents/${encodeURIComponent(documentId)}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveFileId }),
      });
      const finish = await finishResponse.json();
      if (!finishResponse.ok) throw new Error(finish.error || labels.failed);
      form.reset();
      setStatus(labels.success);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
      <label className="muted" style={{ fontSize: ".84rem" }}>{labels.file} <input name="replacement" type="file" required disabled={busy} /></label>
      <button className="btn btn-muted" type="submit" disabled={busy}>{busy ? labels.replacing : labels.replace}</button>
      {status ? <span role="status" className="muted" style={{ fontSize: ".84rem" }}>{status}</span> : null}
    </form>
  );
}
