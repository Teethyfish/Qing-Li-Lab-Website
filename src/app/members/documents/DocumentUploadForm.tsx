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
        <input name="file" type="file" required style={inputStyle} />
        <small className="muted">Any file type. The browser uploads it directly to Google Drive.</small>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <strong>Database title</strong>
        <input name="title" required style={inputStyle} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <strong>Why recipients should read it</strong>
        <textarea name="description" rows={4} required style={inputStyle} />
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

      <label style={{ display: "grid", gap: 6 }}>
        <strong>Additional individual recipients</strong>
        <select name="userIds" multiple size={Math.min(8, Math.max(3, users.length))} style={inputStyle}>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name || user.email} — {user.membershipStatus.toLowerCase()}
            </option>
          ))}
        </select>
        <small className="muted">Use Ctrl/Command-click to select several people.</small>
      </label>

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
