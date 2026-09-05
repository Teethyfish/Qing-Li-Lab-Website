"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ProjectImageCropper from "@/components/ProjectImageCropper";

type ProjectContent = {
  id: string;
  slug: string;
  title: string;
  caption: string;
  body: string;
  tileImageUrl: string | null;
  mainImageUrl: string | null;
  supportingImages: string[];
};

type CropTarget = {
  kind: "tile" | "main" | "supporting-new" | "supporting-existing";
  source: string;
  aspect: number;
  index?: number;
};

async function readImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("image");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProjectParticipantEditor({ initialProject }: { initialProject: ProjectContent }) {
  const t = useTranslations("sitePages.projectEditor");
  const router = useRouter();
  const [draft, setDraft] = useState(initialProject);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function chooseImage(event: ChangeEvent<HTMLInputElement>, kind: "tile" | "main") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setCropTarget({ kind, source: await readImage(file), aspect: kind === "tile" ? 8 / 3 : 12 / 5 });
    } catch {
      setMessage(t("imageError"));
    }
  }

  async function chooseSupportingImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || draft.supportingImages.length >= 4) return;
    try {
      setCropTarget({ kind: "supporting-new", source: await readImage(file), aspect: 4 / 3 });
    } catch {
      setMessage(t("imageError"));
    }
  }

  function completeCrop(image: string) {
    if (!cropTarget) return;
    if (cropTarget.kind === "tile") setDraft((current) => ({ ...current, tileImageUrl: image }));
    if (cropTarget.kind === "main") setDraft((current) => ({ ...current, mainImageUrl: image }));
    if (cropTarget.kind === "supporting-new") setDraft((current) => ({ ...current, supportingImages: [...current.supportingImages, image].slice(0, 4) }));
    if (cropTarget.kind === "supporting-existing" && cropTarget.index !== undefined) {
      setDraft((current) => ({ ...current, supportingImages: current.supportingImages.map((existing, index) => index === cropTarget.index ? image : existing) }));
    }
    setCropTarget(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentOnly: true,
          title: draft.title,
          caption: draft.caption,
          body: draft.body,
          tileImageUrl: draft.tileImageUrl,
          mainImageUrl: draft.mainImageUrl,
          supportingImages: draft.supportingImages,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t("saveError"));
      setMessage(t("saved"));
      router.push(`/projects/${draft.slug}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("saveError"));
      setBusy(false);
    }
  }

  return <form className="tile project-editor project-participant-editor" onSubmit={submit}>
    <div className="project-form-grid">
      <label><span>{t("title")}</span><input required maxLength={200} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
      <label><span>{t("caption")}</span><textarea required maxLength={500} rows={3} value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} /></label>
    </div>
    <label><span>{t("body")}</span><textarea required maxLength={30000} rows={12} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} /></label>

    <div className="project-image-fields">
      <ContentImageField label={t("tilePhoto")} value={draft.tileImageUrl} choose={(event) => chooseImage(event, "tile")} recrop={() => draft.tileImageUrl && setCropTarget({ kind: "tile", source: draft.tileImageUrl, aspect: 8 / 3 })} remove={() => setDraft((current) => ({ ...current, tileImageUrl: null }))} removeLabel={t("removePhoto")} recropLabel={t("recrop")} />
      <ContentImageField label={t("mainPhoto")} value={draft.mainImageUrl} choose={(event) => chooseImage(event, "main")} recrop={() => draft.mainImageUrl && setCropTarget({ kind: "main", source: draft.mainImageUrl, aspect: 12 / 5 })} remove={() => setDraft((current) => ({ ...current, mainImageUrl: null }))} removeLabel={t("removePhoto")} recropLabel={t("recrop")} />
    </div>

    <fieldset className="project-supporting-field">
      <legend>{t("supportingPhotos")}</legend>
      <p className="muted">{t("supportingHelp")}</p>
      <input type="file" accept="image/*" disabled={draft.supportingImages.length >= 4} onChange={chooseSupportingImage} />
      <div className="project-supporting-previews">
        {draft.supportingImages.map((image, index) => <div key={`${index}-${image.slice(-20)}`} className="project-supporting-preview" role="button" tabIndex={0} onClick={() => setCropTarget({ kind: "supporting-existing", source: image, aspect: 4 / 3, index })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setCropTarget({ kind: "supporting-existing", source: image, aspect: 4 / 3, index }); }} style={{ backgroundImage: `url(${image})` }}>
          <span className="project-recrop-overlay">{t("recrop")}</span>
          <button type="button" className="project-photo-remove" aria-label={t("removePhoto")} onClick={(event) => { event.stopPropagation(); setDraft((current) => ({ ...current, supportingImages: current.supportingImages.filter((_, itemIndex) => itemIndex !== index) })); }}>×</button>
        </div>)}
      </div>
    </fieldset>

    {message ? <p className="project-manager-message" role="status">{message}</p> : null}
    <div className="project-editor-actions">
      <button type="submit" className="btn btn-basic" disabled={busy}>{busy ? t("saving") : t("save")}</button>
      <button type="button" className="btn btn-muted" disabled={busy} onClick={() => router.push(`/projects/${draft.slug}`)}>{t("cancel")}</button>
    </div>
    {cropTarget ? <ProjectImageCropper imageSrc={cropTarget.source} aspect={cropTarget.aspect} title={t("cropPhoto")} onComplete={completeCrop} onCancel={() => setCropTarget(null)} /> : null}
  </form>;
}

function ContentImageField({ label, value, choose, recrop, remove, removeLabel, recropLabel }: {
  label: string;
  value: string | null;
  choose: (event: ChangeEvent<HTMLInputElement>) => void;
  recrop: () => void;
  remove: () => void;
  removeLabel: string;
  recropLabel: string;
}) {
  return <fieldset className="project-image-field">
    <legend>{label}</legend>
    <div className={`project-image-preview${value ? " has-image" : ""}`} role={value ? "button" : undefined} tabIndex={value ? 0 : undefined} onClick={value ? recrop : undefined} onKeyDown={value ? (event) => { if (event.key === "Enter" || event.key === " ") recrop(); } : undefined} style={value ? { backgroundImage: `url(${value})` } : undefined}>
      {value ? <span className="project-recrop-overlay">{recropLabel}</span> : null}
    </div>
    <input type="file" accept="image/*" onChange={choose} />
    {value ? <button type="button" className="btn btn-muted" onClick={remove}>{removeLabel}</button> : null}
  </fieldset>;
}
