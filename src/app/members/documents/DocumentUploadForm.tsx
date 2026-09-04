"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

type UserOption = {
  id: string;
  email: string;
  name: string | null;
  membershipStatus: "ACTIVE" | "ALUMNI" | "INACTIVE";
};

type CategoryOption = { id: string; name: string };
type Props = { users: UserOption[]; categories: CategoryOption[] };

export default function DocumentUploadForm({ users, categories }: Props) {
  const t = useTranslations("sitePages.documentsAdmin");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [autoTitle, setAutoTitle] = useState("");
  const [publicOnly, setPublicOnly] = useState(false);

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
      setStatus(t("chooseDocument"));
      return;
    }

    setBusy(true);
    setStatus(t("starting"));
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

      // Keep requests below Vercel's function body limit. Chunks go through the
      // same-origin website proxy so browser CORS cannot interrupt finalization.
      const chunkSize = 2 * 1024 * 1024;
      let offset = 0;
      let uploaded: { id?: string } = {};
      while (offset < file.size) {
        const end = Math.min(offset + chunkSize, file.size);
        const chunk = file.slice(offset, end);
        const percent = Math.round((end / file.size) * 100);
        setStatus(t("uploading", { percent }));
        const uploadResponse = await fetch("/api/documents/upload/chunk", {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
            "X-Drive-Upload-Url": start.sessionUrl,
          },
          body: chunk,
        });

        const uploadResult = await uploadResponse.json().catch(() => null) as {
          complete?: boolean;
          id?: string;
          nextOffset?: number;
          error?: string;
        } | null;
        if (!uploadResponse.ok || !uploadResult) {
          throw new Error(uploadResult?.error || `Upload failed (${uploadResponse.status}).`);
        }
        if (uploadResult.complete && uploadResult.id) {
          uploaded = { id: uploadResult.id };
          offset = file.size;
        } else {
          offset = uploadResult.nextOffset ?? end;
        }
      }

      if (!uploaded.id) throw new Error("Google Drive did not confirm the upload.");

      setStatus(t("creatingNotices"));
      const completeResponse = await fetch("/api/documents/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveFileId: uploaded.id,
          title: data.get("title"),
          description: data.get("description"),
          emailSubject: data.get("emailSubject"),
          isPublic: publicOnly || data.get("isPublic") === "on",
          publicOnly,
          categoryId: data.get("categoryId"),
          groups: data.getAll("groups"),
          userIds: data.getAll("userIds"),
        }),
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error || "Could not publish document.");

      if (publicOnly) {
        setStatus(t("publishedPublicOnly"));
      } else {
        const emailNote = completed.emailFailureCount
          ? t("emailFailures", { count: completed.emailFailureCount })
          : t("emailsSent");
        setStatus(`${t("published", { count: completed.recipientCount })} ${emailNote}`);
      }
      form.reset();
      setTitle("");
      setAutoTitle("");
      setPublicOnly(false);
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
        <strong>{t("document")}</strong>
        <input name="file" type="file" required onChange={handleFileChange} style={inputStyle} />
        <small className="muted">{t("documentHelp")}</small>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <strong>{t("category")}</strong>
        <select name="categoryId" style={inputStyle} defaultValue="">
          <option value="">{t("uncategorized")}</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <strong>{t("documentTitle")}</strong>
        <input
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          style={inputStyle}
        />
        <small className="muted">{t("titleHelp")}</small>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <strong>{t("summary")}</strong>
        <textarea name="description" rows={4} required style={inputStyle} />
        <small className="muted">{t("summaryHelp")}</small>
      </label>

      <label className="document-public-only-option" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input type="checkbox" checked={publicOnly} onChange={(event) => setPublicOnly(event.target.checked)} />
        <span><strong>{t("publicOnly")}</strong><small className="muted" style={{ display: "block" }}>{t("publicOnlyHelp")}</small></span>
      </label>

      {!publicOnly ? <>
        <label style={{ display: "grid", gap: 6 }}>
          <strong>{t("emailTitle")}</strong>
          <input name="emailSubject" required style={inputStyle} />
        </label>

      <fieldset style={{ border: "1px solid color-mix(in oklab, var(--color-text) 18%, transparent)", padding: "1rem" }}>
        <legend style={{ padding: "0 0.35rem", fontWeight: 700 }}>{t("audienceGroups")}</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.5rem" }}>
          {[
            ["ACTIVE", t("activeMembers")],
            ["ALUMNI", t("alumni")],
            ["INACTIVE", t("inactiveMembers")],
          ].map(([value, label]) => (
            <label key={value} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" name="groups" value={value} /> {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid color-mix(in oklab, var(--color-text) 18%, transparent)", padding: "1rem" }}>
        <legend style={{ padding: "0 0.35rem", fontWeight: 700 }}>{t("individuals")}</legend>
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
          <p className="muted" style={{ margin: 0 }}>{t("noUsers")}</p>
        )}
      </fieldset>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" name="isPublic" />
        <span>{t("publicDatabase")}</span>
      </label>
      </> : null}

      <div>
        <button type="submit" className="btn btn-basic" disabled={busy}>
          {busy ? t("publishing") : publicOnly ? t("uploadPublicOnly") : t("uploadNotify")}
        </button>
      </div>
      {status ? <p role="status" style={{ margin: 0 }}>{status}</p> : null}
    </form>
  );
}
