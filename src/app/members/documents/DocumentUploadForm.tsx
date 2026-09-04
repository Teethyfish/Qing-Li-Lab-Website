"use client";

import { FormEvent, useState } from "react";

type UserOption = {
  id: string;
  email: string;
  name: string | null;
  membershipStatus: "ACTIVE" | "ALUMNI" | "INACTIVE";
};

type Props = { users: UserOption[] };

export default function DocumentUploadForm({ users }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [autoTitle, setAutoTitle] = useState("");

  function titleFromFileName(fileName: string) {
    const withoutExtension = fileName.replace(/\.[^.]+$/, "");
    return withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextAutoTitle = titleFromFileName(file.name);
    setTitle((current) => (!current.trim() || current === autoTitle ? nextAutoTitle : current));
    setAutoTitle(nextAutoTitle);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setStatus("Choose a document first.");
      return;
    }

    setBusy(true);
    setStatus("Starting secure Google Drive upload…");
    try {
      const startResponse = await fetch("/api/documents/upload/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      const start = await startResponse.json();
      if (!startResponse.ok) throw new Error(start.error || "Could not start upload.");

      const chunkSize = 8 * 1024 * 1024;
      let offset = 0;
      let uploaded: { id?: string; error?: { message?: string } } = {};
      while (offset < file.size) {
        const end = Math.min(offset + chunkSize, file.size);
        const chunk = file.slice(offset, end);
        const percent = Math.round((end / file.size) * 100);
        setStatus(`Uploading directly to qinglilab@gmail.com Google Drive… ${percent}%`);
        const uploadResponse = await fetch(start.sessionUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
          },
          body: chunk,
        });

        if (uploadResponse.status === 308) {
          offset = end;
          continue;
        }
        uploaded = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || !uploaded.id) {
          throw new Error(uploaded.error?.message || "Google Drive upload failed.");
        }
        offset = file.size;
      }

      if (!uploaded.id) throw new Error("Google Drive did not confirm the upload.");

      setStatus("Creating notifications and sending email…");
      const completeResponse = await fetch("/api/documents/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveFileId: uploaded.id,
          title: data.get("title"),
          description: data.get("description"),
          emailSubject: data.get("emailSubject"),
          isPublic: data.get("isPublic") === "on",
          groups: data.getAll("groups"),
          userIds: data.getAll("userIds"),
        }),
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error || "Could not publish document.");

      const emailNote = completed.emailFailureCount
        ? ` ${completed.emailFailureCount} email notification(s) failed; the website notifications were still created.`
        : " Email and website notifications were sent.";
      setStatus(`Published to ${completed.recipientCount} recipient(s).${emailNote}`);
      form.reset();
      setTitle("");
      setAutoTitle("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.65rem 0.75rem",
    border: "1px solid color-mix(in oklab, var(--color-text) 20%, transparent)",
    background: "var(--color-card)",
    color: "var(--color-text)",
  };

  return (
    <form onSubmit={submit} className="tile" style={{ display: "grid", gap: "1rem" }}>
      <label style={{ display: "grid", gap: 6 }}>
        <strong>Document</strong>
        <input name="file" type="file" required onChange={handleFileChange} style={inputStyle} />
        <small className="muted">Any file type. The browser uploads it directly to Google Drive.</small>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <strong>Document Title</strong>
        <input
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          style={inputStyle}
        />
        <small className="muted">Filled from the filename automatically; edit it if needed.</small>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <strong>Document summary and relevance</strong>
        <textarea name="description" rows={4} required style={inputStyle} />
        <small className="muted">Briefly describe the document and explain its relevance to recipients.</small>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <strong>Email title</strong>
        <input name="emailSubject" required style={inputStyle} />
      </label>

      <fieldset style={{ border: "1px solid color-mix(in oklab, var(--color-text) 18%, transparent)", padding: "1rem" }}>
        <legend style={{ padding: "0 0.35rem", fontWeight: 700 }}>Audience groups</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.5rem" }}>
          {[
            ["ACTIVE", "Active members"],
            ["ALUMNI", "Alumni"],
            ["INACTIVE", "Inactive members"],
          ].map(([value, label]) => (
            <label key={value} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" name="groups" value={value} /> {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid color-mix(in oklab, var(--color-text) 18%, transparent)", padding: "1rem" }}>
        <legend style={{ padding: "0 0.35rem", fontWeight: 700 }}>Additional individual recipients</legend>
        {users.length ? (
          <div
            style={{
              display: "grid",
              gap: "0.6rem",
              maxHeight: 240,
              overflowY: "auto",
              padding: "0.25rem",
            }}
          >
            {users.map((user) => (
              <label key={user.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input type="checkbox" name="userIds" value={user.id} />
                <span>
                  <strong>{user.name || user.email}</strong>
                  {user.name ? <span className="muted"> — {user.email}</span> : null}
                  <span className="muted"> ({user.membershipStatus.toLowerCase()})</span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>No user accounts are available.</p>
        )}
      </fieldset>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" name="isPublic" />
        <span>Also place this in the public database (visible without signing in)</span>
      </label>

      <div>
        <button type="submit" className="btn btn-basic" disabled={busy}>
          {busy ? "Publishing…" : "Upload and notify"}
        </button>
      </div>
      {status ? <p role="status" style={{ margin: 0 }}>{status}</p> : null}
    </form>
  );
}
