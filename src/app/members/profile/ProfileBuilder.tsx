"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Grip, Plus, Trash2 } from "lucide-react";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import {
  PROFILE_HEADER_LAYOUT,
  defaultProfileTileLayout,
  profileTileSize,
  type ProfileBlockLayout,
  type ProfilePublication,
  type ProfileTile,
  type PublicProfileContent,
} from "@/lib/public-profile";
import { useTranslations } from "next-intl";

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  about: string | null;
  imageUrl: string | null;
  slug: string | null;
  profileContent: PublicProfileContent;
};

type DragState = {
  pointerId: number;
  blockId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  element: HTMLElement;
};

const newId = () => crypto.randomUUID();

function resizePhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file."));
    if (file.size > 12 * 1024 * 1024) return reject(new Error("Choose an image smaller than 12 MB."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not open that image."));
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const value = canvas.toDataURL("image/jpeg", .82);
        if (value.length > 1_600_000) return reject(new Error("The compressed image is still too large. Choose a smaller photo."));
        resolve(value);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function compressProfilePhoto(source: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Could not process the profile photo."));
    image.onload = () => {
      const scale = Math.min(1, 900 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      const value = canvas.toDataURL("image/jpeg", .84);
      if (value.length > 1_600_000) return reject(new Error("The profile photo is too large."));
      resolve(value);
    };
    image.src = source;
  });
}

export default function ProfileBuilder({ user, isAdminEditing }: { user: UserProfile; isAdminEditing: boolean }) {
  const t = useTranslations("sitePages.profile");
  const [name, setName] = useState(user.name || "");
  const [about, setAbout] = useState(user.about || "");
  const [profileImage, setProfileImage] = useState<string | null>(user.imageUrl);
  const [profile, setProfile] = useState(user.profileContent);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const topZ = Math.max(
    profile.layout.contact.zIndex,
    profile.layout.publications.zIndex,
    ...profile.tiles.map((tile) => tile.layout.zIndex),
    3,
  );
  const dashboardHeight = useMemo(() => Math.max(
    1_050,
    PROFILE_HEADER_LAYOUT.y + PROFILE_HEADER_LAYOUT.height + 30,
    profile.layout.contact.y + profile.layout.contact.height + 30,
    profile.layout.publications.y + profile.layout.publications.height + 30,
    ...profile.tiles.map((tile) => tile.layout.y + tile.layout.height + 30),
  ), [profile]);

  const updatePublication = (id: string, values: Partial<ProfilePublication>) => setProfile((current) => ({
    ...current,
    publications: current.publications.map((publication) => publication.id === id ? { ...publication, ...values } : publication),
  }));
  const updateTile = (id: string, values: Partial<ProfileTile>) => setProfile((current) => ({
    ...current,
    tiles: current.tiles.map((tile) => tile.id === id ? { ...tile, ...values } : tile),
  }));
  const updateBlockLayout = (blockId: string, values: Partial<ProfileBlockLayout>) => setProfile((current) => {
    if (blockId === "contact" || blockId === "publications") {
      return { ...current, layout: { ...current.layout, [blockId]: { ...current.layout[blockId], ...values } } };
    }
    return {
      ...current,
      tiles: current.tiles.map((tile) => tile.id === blockId ? { ...tile, layout: { ...tile.layout, ...values } } : tile),
    };
  });

  const addTile = (type: ProfileTile["type"]) => setProfile((current) => ({
    ...current,
    tiles: [...current.tiles, {
      id: newId(),
      type,
      title: type === "photo" ? t("photo") : t("newSection"),
      content: "",
      imageUrl: "",
      size: "standard",
      layout: defaultProfileTileLayout(current.tiles.length),
    }],
  }));

  const addPublication = () => setProfile((current) => ({
    ...current,
    publications: [...current.publications, {
      id: newId(),
      title: "",
      authors: "",
      description: "",
      journal: "",
      publishDate: "",
      doi: "",
      url: "",
    }],
  }));

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>, blockId: string, layout: ProfileBlockLayout) => {
    if (event.button !== 0) return;
    const element = event.currentTarget.closest<HTMLElement>(".profile-dashboard-tile");
    if (!element) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      blockId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layout.x,
      startY: layout.y,
      element,
    };
    element.style.zIndex = String(topZ + 1);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const board = boardRef.current;
    const maxX = Math.max(0, (board?.clientWidth || 1_100) - drag.element.offsetWidth);
    const maxY = Math.max(0, dashboardHeight - drag.element.offsetHeight);
    const x = Math.max(0, Math.min(maxX, drag.startX + event.clientX - drag.startClientX));
    const y = Math.max(0, Math.min(maxY, drag.startY + event.clientY - drag.startClientY));
    drag.element.style.left = `${x}px`;
    drag.element.style.top = `${y}px`;
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    updateBlockLayout(drag.blockId, {
      x: Number.parseFloat(drag.element.style.left) || 0,
      y: Number.parseFloat(drag.element.style.top) || 0,
      zIndex: topZ + 1,
    });
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/members/profile/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, about, imageUrl: profileImage, profileContent: profile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save profile.");
      setStatus(t("saved"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save profile.");
    } finally { setSaving(false); }
  };

  const tileStyle = (layout: ProfileBlockLayout): React.CSSProperties => ({
    left: layout.x,
    top: layout.y,
    width: layout.width,
    height: layout.height,
    zIndex: layout.zIndex,
  });
  const dragHandle = (blockId: string, layout: ProfileBlockLayout) => <button
    type="button"
    className="profile-dashboard-drag"
    aria-label={t("dragArrange")}
    title={t("dragArrange")}
    onPointerDown={(event) => startDrag(event, blockId, layout)}
    onPointerMove={moveDrag}
    onPointerUp={finishDrag}
    onPointerCancel={finishDrag}
  ><Grip size={16} aria-hidden="true" /> {t("dragTile")}</button>;

  return <div data-edit-ignore="true" className="profile-builder">
    {isAdminEditing ? <div className="profile-admin-notice"><strong>{t("adminEditing")}</strong> {t("adminEditingText")}</div> : null}

    <div className="profile-dashboard-toolbar">
      <div><strong>{t("profileDashboard")}</strong><span className="muted">{t("dashboardHelp")}</span></div>
      <div><button type="button" className="btn btn-basic" onClick={() => addTile("text")}><Plus size={15} /> {t("addTextTile")}</button><button type="button" className="btn btn-basic" onClick={() => addTile("photo")}><Plus size={15} /> {t("addPhotoTile")}</button></div>
    </div>

    <div className="profile-dashboard-scroll">
      <div ref={boardRef} className="profile-dashboard-canvas" style={{ height: dashboardHeight }}>
        <section className="card profile-dashboard-tile profile-header-editor" style={tileStyle(PROFILE_HEADER_LAYOUT)}>
          <div className="profile-dashboard-tile-heading fixed"><h2>{t("profileHeader")}</h2><span>{t("fixedPosition")}</span></div>
          <div className="profile-dashboard-tile-body">
            <ProfilePictureUpload key={profileImage ? "with-image" : "without-image"} currentImageUrl={profileImage} userName={name} onImageCropped={(image) => {
              void compressProfilePhoto(image).then(setProfileImage).catch((error) => setStatus(error instanceof Error ? error.message : "Could not process profile photo."));
            }} />
            {profileImage ? <button type="button" className="btn btn-muted" onClick={() => setProfileImage(null)}>{t("removePhoto")}</button> : null}
            <label className="form-field"><strong>{t("displayName")}</strong><input value={name} maxLength={160} onChange={(event) => setName(event.target.value)} /></label>
            <label className="form-field"><strong>{t("about")}</strong><textarea value={about} rows={7} maxLength={12000} onChange={(event) => setAbout(event.target.value)} /></label>
          </div>
        </section>

        <section className="card profile-dashboard-tile" style={tileStyle(profile.layout.contact)}>
          <div className="profile-dashboard-tile-heading"><h2>{t("contactInformation")}</h2>{dragHandle("contact", profile.layout.contact)}</div>
          <div className="profile-dashboard-tile-body">
            <label className="form-field"><strong>{t("publicEmail")}</strong><input type="email" value={profile.contact.publicEmail} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, publicEmail: event.target.value } }))} /></label>
            <label className="form-field"><strong>{t("professionalTitle")}</strong><input value={profile.contact.title} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, title: event.target.value } }))} /></label>
            <label className="form-field"><strong>{t("department")}</strong><input value={profile.contact.department} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, department: event.target.value } }))} /></label>
            <label className="form-field"><strong>{t("phone")}</strong><input value={profile.contact.phone} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, phone: event.target.value } }))} /></label>
            <label className="form-field"><strong>{t("officeLocation")}</strong><input value={profile.contact.office} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, office: event.target.value } }))} /></label>
            <label className="form-field"><strong>{t("website")}</strong><input type="url" placeholder="https://" value={profile.contact.website} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, website: event.target.value } }))} /></label>
          </div>
        </section>

        <section className="card profile-dashboard-tile publications-editor-tile" style={tileStyle(profile.layout.publications)}>
          <div className="profile-dashboard-tile-heading"><h2>{t("publications")}</h2><div className="profile-dashboard-heading-actions">{dragHandle("publications", profile.layout.publications)}<button type="button" className="btn btn-basic" onClick={addPublication}><Plus size={15} /> {t("addPublication")}</button></div></div>
          <div className="profile-dashboard-tile-body publication-editor-list">
            {profile.publications.map((publication, index) => <article className="publication-editor-card" key={publication.id}>
              <div className="publication-editor-heading"><strong>{t("publicationNumber", { number: index + 1 })}</strong><button type="button" className="profile-remove-icon" aria-label={t("remove")} title={t("remove")} onClick={() => setProfile((current) => ({ ...current, publications: current.publications.filter((item) => item.id !== publication.id) }))}><Trash2 size={14} /></button></div>
              <label className="form-field">{t("title")}<input value={publication.title} onChange={(event) => updatePublication(publication.id, { title: event.target.value })} /></label>
              <label className="form-field">{t("authors")}<textarea rows={2} value={publication.authors} onChange={(event) => updatePublication(publication.id, { authors: event.target.value })} /></label>
              <div className="profile-publication-grid"><label className="form-field">{t("journal")}<input value={publication.journal} onChange={(event) => updatePublication(publication.id, { journal: event.target.value })} /></label><label className="form-field">{t("publicationDate")}<input type="date" value={publication.publishDate} onChange={(event) => updatePublication(publication.id, { publishDate: event.target.value })} /></label></div>
              <label className="form-field">{t("doi")}<input placeholder="10.xxxx/…" value={publication.doi} onChange={(event) => updatePublication(publication.id, { doi: event.target.value })} /></label>
              <label className="form-field">{t("publicationDescription")}<textarea rows={3} value={publication.description} onChange={(event) => updatePublication(publication.id, { description: event.target.value })} /></label>
            </article>)}
            {!profile.publications.length ? <p className="muted">{t("noPublications")}</p> : null}
          </div>
        </section>

        {profile.tiles.map((tile) => <section key={tile.id} className="card profile-dashboard-tile custom-profile-editor-tile" style={tileStyle(tile.layout)}>
          <div className="profile-dashboard-tile-heading"><h2>{tile.title || (tile.type === "photo" ? t("photo") : t("newSection"))}</h2><div className="profile-dashboard-heading-actions">{dragHandle(tile.id, tile.layout)}<button type="button" className="profile-remove-icon" aria-label={t("removeTile")} title={t("removeTile")} onClick={() => setProfile((current) => ({ ...current, tiles: current.tiles.filter((item) => item.id !== tile.id) }))}><Trash2 size={14} /></button></div></div>
          <div className="profile-dashboard-tile-body">
            <label className="form-field">{t("tileTitle")}<input value={tile.title} onChange={(event) => updateTile(tile.id, { title: event.target.value })} /></label>
            <label className="form-field">{t("tileSize")}<select value={tile.size} onChange={(event) => {
              const size = event.target.value as ProfileTile["size"];
              updateTile(tile.id, { size, layout: { ...tile.layout, ...profileTileSize(size) } });
            }}><option value="standard">{t("standard")}</option><option value="wide">{t("wide")}</option><option value="large">{t("large")}</option></select></label>
            {tile.type === "text" ? <label className="form-field">{t("text")}<textarea rows={7} value={tile.content} onChange={(event) => updateTile(tile.id, { content: event.target.value })} /></label> : <>
              <label className="form-field">{t("photo")}<input type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { updateTile(tile.id, { imageUrl: await resizePhoto(file) }); setStatus(null); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not process photo."); } }} /></label>
              {tile.imageUrl ? <img src={tile.imageUrl} alt={t("photo")} className="profile-tile-preview" /> : <div className="profile-photo-placeholder">{t("choosePhoto")}</div>}
              <label className="form-field">{t("caption")}<textarea rows={3} value={tile.content} onChange={(event) => updateTile(tile.id, { content: event.target.value })} /></label>
            </>}
          </div>
        </section>)}
      </div>
    </div>

    <div className="profile-save-bar">
      <button type="button" className="btn btn-basic" disabled={saving} onClick={save}>{saving ? t("saving") : t("saveProfile")}</button>
      {user.slug ? <Link className="btn btn-muted" href={`/people/${user.slug}`} target="_blank">{t("previewProfile")}</Link> : null}
      {status ? <span role="status">{status}</span> : null}
    </div>
  </div>;
}
