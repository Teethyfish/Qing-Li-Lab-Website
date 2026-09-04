"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ProjectImageCropper from "@/components/ProjectImageCropper";

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
type CropTarget = {
  kind: "tile" | "main" | "supporting-new" | "supporting-existing";
  source: string;
  aspect: number;
  index?: number;
};

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

async function readImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("image");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProjectManager({ initialProjects, users }: { initialProjects: Project[]; users: UserOption[] }) {
  const t = useTranslations("sitePages.projectsAdmin");
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);

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
      setCropTarget({
        kind: field === "tileImageUrl" ? "tile" : "main",
        source: await readImage(file),
        aspect: field === "tileImageUrl" ? 8 / 3 : 12 / 5,
      });
    } catch {
      setMessage(t("imageError"));
    }
  };

  const chooseSupportingImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || draft.supportingImages.length >= 4) return;
    try {
      setCropTarget({ kind: "supporting-new", source: await readImage(file), aspect: 4 / 3 });
    } catch {
      setMessage(t("imageError"));
    }
  };

  const completeCrop = (image: string) => {
    if (!cropTarget) return;
    if (cropTarget.kind === "tile") setDraft((current) => ({ ...current, tileImageUrl: image }));
    if (cropTarget.kind === "main") setDraft((current) => ({ ...current, mainImageUrl: image }));
    if (cropTarget.kind === "supporting-new") setDraft((current) => ({ ...current, supportingImages: [...current.supportingImages, image].slice(0, 4) }));
    if (cropTarget.kind === "supporting-existing" && cropTarget.index !== undefined) {
      setDraft((current) => ({ ...current, supportingImages: current.supportingImages.map((existing, index) => index === cropTarget.index ? image : existing) }));
    }
    setCropTarget(null);
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
        <ImageField label={t("tilePhoto")} value={draft.tileImageUrl} onChoose={(event) => chooseImage(event, "tileImageUrl")} onRecrop={() => draft.tileImageUrl && setCropTarget({ kind: "tile", source: draft.tileImageUrl, aspect: 8 / 3 })} onRemove={() => setDraft((current) => ({ ...current, tileImageUrl: null }))} removeLabel={t("removePhoto")} recropLabel={t("clickToRecrop")} />
        <ImageField label={t("mainPhoto")} value={draft.mainImageUrl} onChoose={(event) => chooseImage(event, "mainImageUrl")} onRecrop={() => draft.mainImageUrl && setCropTarget({ kind: "main", source: draft.mainImageUrl, aspect: 12 / 5 })} onRemove={() => setDraft((current) => ({ ...current, mainImageUrl: null }))} removeLabel={t("removePhoto")} recropLabel={t("clickToRecrop")} />
      </div>

      <fieldset className="project-supporting-field">
        <legend>{t("supportingPhotos")}</legend>
        <p className="muted">{t("supportingHelp")}</p>
        <input type="file" accept="image/*" disabled={draft.supportingImages.length >= 4} onChange={chooseSupportingImages} />
        <div className="project-supporting-previews">
          {draft.supportingImages.map((image, index) => <div key={`${image.slice(-25)}-${index}`} className="project-supporting-preview" role="button" tabIndex={0} aria-label={t("recropSupporting", { number: index + 1 })} onClick={() => setCropTarget({ kind: "supporting-existing", source: image, aspect: 4 / 3, index })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setCropTarget({ kind: "supporting-existing", source: image, aspect: 4 / 3, index }); }} style={{ backgroundImage: `url(${image})` }}>
            <span className="project-recrop-overlay">{t("clickToRecrop")}</span>
            <button type="button" className="project-photo-remove" aria-label={t("removePhoto")} onClick={(event) => { event.stopPropagation(); setDraft((current) => ({ ...current, supportingImages: current.supportingImages.filter((_, imageIndex) => imageIndex !== index) })); }}>×</button>
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
      {cropTarget ? <ProjectImageCropper imageSrc={cropTarget.source} aspect={cropTarget.aspect} title={t("cropPhoto")} onComplete={completeCrop} onCancel={() => setCropTarget(null)} /> : null}
    </form>
  </div>;
}

function ImageField({ label, value, onChoose, onRecrop, onRemove, removeLabel, recropLabel }: { label: string; value: string | null; onChoose: (event: ChangeEvent<HTMLInputElement>) => void; onRecrop: () => void; onRemove: () => void; removeLabel: string; recropLabel: string }) {
  return <fieldset className="project-image-field">
    <legend>{label}</legend>
    <div className={`project-image-preview${value ? " has-image" : ""}`} role={value ? "button" : undefined} tabIndex={value ? 0 : undefined} onClick={value ? onRecrop : undefined} onKeyDown={value ? (event) => { if (event.key === "Enter" || event.key === " ") onRecrop(); } : undefined} style={value ? { backgroundImage: `url(${value})` } : undefined}>
      {value ? <span className="project-recrop-overlay">{recropLabel}</span> : null}
    </div>
    <input type="file" accept="image/*" onChange={onChoose} />
    {value ? <button type="button" className="btn btn-muted" onClick={onRemove}>{removeLabel}</button> : null}
  </fieldset>;
}
