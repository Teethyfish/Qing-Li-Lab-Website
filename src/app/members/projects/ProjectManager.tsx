"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Participant = { userId: string; isCurrent: boolean };
type Project = {
  id: string;
  slug: string;
  title: string;
  caption: string;
  body: string;
  tileImageUrl: string | null;
  mainImageUrl: string | null;
  supportingImages: string[];
  isPublished: boolean;
  participants: Participant[];
};
type UserOption = { id: string; name: string | null; email: string; membershipStatus: string };
type Draft = Omit<Project, "id">;

const emptyDraft: Draft = {
  slug: "",
  title: "",
  caption: "",
  body: "",
  tileImageUrl: null,
  mainImageUrl: null,
  supportingImages: [],
  isPublished: true,
  participants: [],
};

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("image");
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = source;
  });
  const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  let result = canvas.toDataURL("image/jpeg", 0.76);
  if (result.length > 650_000) result = canvas.toDataURL("image/jpeg", 0.55);
  if (result.length > 800_000) throw new Error("size");
  return result;
}

export default function ProjectManager({ initialProjects, users }: { initialProjects: Project[]; users: UserOption[] }) {
  const t = useTranslations("sitePages.projectsAdmin");
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const beginNew = () => { setEditingId(null); setDraft(emptyDraft); setMessage(""); };
  const beginEdit = (project: Project) => {
    setEditingId(project.id);
    setDraft({
      slug: project.slug,
      title: project.title,
      caption: project.caption,
      body: project.body,
      tileImageUrl: project.tileImageUrl,
      mainImageUrl: project.mainImageUrl,
      supportingImages: [...project.supportingImages],
      isPublished: project.isPublished,
      participants: project.participants.map((participant) => ({ ...participant })),
    });
    setMessage("");
    document.getElementById("project-editor")?.scrollIntoView({ behavior: "smooth" });
  };

  const chooseImage = async (event: ChangeEvent<HTMLInputElement>, field: "tileImageUrl" | "mainImageUrl") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setDraft((current) => ({ ...current, [field]: null }));
      const value = await compressImage(file);
      setDraft((current) => ({ ...current, [field]: value }));
    } catch {
      setMessage(t("imageError"));
    }
  };

  const chooseSupportingImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 4 - draft.supportingImages.length);
    event.target.value = "";
    try {
      const images = await Promise.all(files.map(compressImage));
      setDraft((current) => ({ ...current, supportingImages: [...current.supportingImages, ...images].slice(0, 4) }));
    } catch {
      setMessage(t("imageError"));
    }
  };

  const setParticipant = (userId: string, status: string) => {
    setDraft((current) => ({
      ...current,
      participants: status === "none"
        ? current.participants.filter((item) => item.userId !== userId)
        : [...current.participants.filter((item) => item.userId !== userId), { userId, isCurrent: status === "current" }],
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(editingId ? `/api/projects/${editingId}` : "/api/projects", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t("saveError"));
      setMessage(t("saved"));
      router.refresh();
      window.setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("saveError"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (project: Project) => {
    if (!window.confirm(t("deleteConfirm", { title: project.title }))) return;
    setBusy(true);
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (response.ok) {
      setProjects((current) => current.filter((item) => item.id !== project.id));
      if (editingId === project.id) beginNew();
      router.refresh();
    } else {
      setMessage(t("deleteError"));
    }
    setBusy(false);
  };

  return <div className="project-manager">
    <section className="tile project-list-panel">
      <div className="project-panel-heading">
        <div><h2>{t("existingProjects")}</h2><p className="muted">{t("existingHelp")}</p></div>
        <button type="button" className="btn btn-basic" onClick={beginNew}>{t("addProject")}</button>
      </div>
      <div className="project-admin-grid">
        {projects.map((project) => <article key={project.id} className="project-admin-card">
          <div className="project-admin-thumb" style={project.tileImageUrl ? { backgroundImage: `url(${project.tileImageUrl})` } : undefined}>
            {!project.tileImageUrl ? <span>{t("photoPlaceholder")}</span> : null}
          </div>
          <div className="project-admin-card-body">
            <strong>{project.title}</strong>
            <small className="muted">/{project.slug} · {project.isPublished ? t("published") : t("draft")}</small>
            <p>{project.caption}</p>
            <div className="project-card-actions">
              <button type="button" className="btn btn-muted" onClick={() => beginEdit(project)}>{t("edit")}</button>
              <Link className="btn btn-muted" href={`/projects/${project.slug}`} target="_blank">{t("preview")}</Link>
              <button type="button" className="btn btn-warning" disabled={busy} onClick={() => remove(project)}>{t("delete")}</button>
            </div>
          </div>
        </article>)}
        {!projects.length ? <p className="muted">{t("none")}</p> : null}
      </div>
    </section>

    <form id="project-editor" className="tile project-editor" onSubmit={submit}>
      <h2>{editingId ? t("editProject") : t("newProject")}</h2>
      <div className="project-form-grid">
        <label><span>{t("titleField")}</span><input required maxLength={200} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value, slug: current.slug ? current.slug : slugify(event.target.value) }))} /></label>
        <label><span>{t("slug")}</span><input required pattern="[a-z0-9-]+" maxLength={80} value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: slugify(event.target.value) }))} /></label>
      </div>
      <label><span>{t("caption")}</span><textarea required maxLength={500} rows={3} value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} /></label>
      <label><span>{t("body")}</span><textarea required maxLength={30000} rows={10} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} /></label>

      <div className="project-image-fields">
        <ImageField label={t("tilePhoto")} value={draft.tileImageUrl} onChoose={(event) => chooseImage(event, "tileImageUrl")} onRemove={() => setDraft((current) => ({ ...current, tileImageUrl: null }))} removeLabel={t("removePhoto")} />
        <ImageField label={t("mainPhoto")} value={draft.mainImageUrl} onChoose={(event) => chooseImage(event, "mainImageUrl")} onRemove={() => setDraft((current) => ({ ...current, mainImageUrl: null }))} removeLabel={t("removePhoto")} />
      </div>

      <fieldset className="project-supporting-field">
        <legend>{t("supportingPhotos")}</legend>
        <p className="muted">{t("supportingHelp")}</p>
        <input type="file" accept="image/*" multiple disabled={draft.supportingImages.length >= 4} onChange={chooseSupportingImages} />
        <div className="project-supporting-previews">
          {draft.supportingImages.map((image, index) => <div key={`${image.slice(-25)}-${index}`} className="project-supporting-preview" style={{ backgroundImage: `url(${image})` }}>
            <button type="button" className="project-photo-remove" aria-label={t("removePhoto")} onClick={() => setDraft((current) => ({ ...current, supportingImages: current.supportingImages.filter((_, imageIndex) => imageIndex !== index) }))}>×</button>
          </div>)}
        </div>
      </fieldset>

      <fieldset className="project-participants">
        <legend>{t("participants")}</legend>
        <p className="muted">{t("participantsHelp")}</p>
        <div className="project-participant-grid">
          {users.map((user) => {
            const participant = draft.participants.find((item) => item.userId === user.id);
            return <label key={user.id}>
              <span><strong>{user.name || user.email}</strong><small className="muted">{user.email} · {user.membershipStatus}</small></span>
              <select value={!participant ? "none" : participant.isCurrent ? "current" : "past"} onChange={(event) => setParticipant(user.id, event.target.value)}>
                <option value="none">{t("notInvolved")}</option>
                <option value="current">{t("currentlyInvolved")}</option>
                <option value="past">{t("previouslyInvolved")}</option>
              </select>
            </label>;
          })}
        </div>
      </fieldset>

      <label className="project-publish-toggle"><input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft((current) => ({ ...current, isPublished: event.target.checked }))} /> <span>{t("publish")}</span></label>
      {message ? <p className="project-manager-message" role="status">{message}</p> : null}
      <div className="project-editor-actions">
        <button type="submit" className="btn btn-basic" disabled={busy}>{busy ? t("saving") : t("save")}</button>
        {editingId ? <button type="button" className="btn btn-muted" onClick={beginNew}>{t("cancel")}</button> : null}
      </div>
    </form>
  </div>;
}

function ImageField({ label, value, onChoose, onRemove, removeLabel }: { label: string; value: string | null; onChoose: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void; removeLabel: string }) {
  return <fieldset className="project-image-field">
    <legend>{label}</legend>
    <div className="project-image-preview" style={value ? { backgroundImage: `url(${value})` } : undefined} />
    <input type="file" accept="image/*" onChange={onChoose} />
    {value ? <button type="button" className="btn btn-muted" onClick={onRemove}>{removeLabel}</button> : null}
  </fieldset>;
}
