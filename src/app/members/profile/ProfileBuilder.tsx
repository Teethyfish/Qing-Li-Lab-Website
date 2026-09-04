"use client";

import Link from "next/link";
import { useState } from "react";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import type { ProfilePublication, ProfileTile, PublicProfileContent } from "@/lib/public-profile";
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
  const [draggedTileId, setDraggedTileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const updatePublication = (id: string, values: Partial<ProfilePublication>) => setProfile((current) => ({
    ...current,
    publications: current.publications.map((publication) => publication.id === id ? { ...publication, ...values } : publication),
  }));
  const updateTile = (id: string, values: Partial<ProfileTile>) => setProfile((current) => ({
    ...current,
    tiles: current.tiles.map((tile) => tile.id === id ? { ...tile, ...values } : tile),
  }));

  const addTile = (type: ProfileTile["type"]) => setProfile((current) => ({
    ...current,
    tiles: [...current.tiles, { id: newId(), type, title: type === "photo" ? t("photo") : t("newSection"), content: "", imageUrl: "", size: "standard" }],
  }));

  const dropTile = (targetId: string) => {
    if (!draggedTileId || draggedTileId === targetId) return;
    setProfile((current) => {
      const tiles = [...current.tiles];
      const from = tiles.findIndex((tile) => tile.id === draggedTileId);
      const to = tiles.findIndex((tile) => tile.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = tiles.splice(from, 1);
      tiles.splice(to, 0, moved);
      return { ...current, tiles };
    });
    setDraggedTileId(null);
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

  return <div data-edit-ignore="true" className="profile-builder">
    {isAdminEditing ? <div className="profile-admin-notice"><strong>{t("adminEditing")}</strong> {t("adminEditingText")}</div> : null}
    <section className="card profile-builder-section">
      <h2>{t("profileHeader")}</h2>
      <ProfilePictureUpload key={profileImage ? "with-image" : "without-image"} currentImageUrl={profileImage} userName={name} onImageCropped={(image) => {
        void compressProfilePhoto(image).then(setProfileImage).catch((error) => setStatus(error instanceof Error ? error.message : "Could not process profile photo."));
      }} />
      {profileImage ? <button className="btn btn-muted" onClick={() => setProfileImage(null)}>{t("removePhoto")}</button> : null}
      <label className="form-field"><strong>{t("displayName")}</strong><input value={name} maxLength={160} onChange={(event) => setName(event.target.value)} /></label>
      <label className="form-field"><strong>{t("about")}</strong><textarea value={about} rows={7} maxLength={12000} onChange={(event) => setAbout(event.target.value)} /></label>
    </section>

    <section className="card profile-builder-section">
      <h2>{t("contactInformation")}</h2>
      <div className="profile-form-grid">
        <label className="form-field"><strong>{t("publicEmail")}</strong><input type="email" value={profile.contact.publicEmail} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, publicEmail: event.target.value } }))} /></label>
        <label className="form-field"><strong>{t("professionalTitle")}</strong><input value={profile.contact.title} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, title: event.target.value } }))} /></label>
        <label className="form-field"><strong>{t("department")}</strong><input value={profile.contact.department} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, department: event.target.value } }))} /></label>
        <label className="form-field"><strong>{t("phone")}</strong><input value={profile.contact.phone} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, phone: event.target.value } }))} /></label>
        <label className="form-field"><strong>{t("officeLocation")}</strong><input value={profile.contact.office} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, office: event.target.value } }))} /></label>
        <label className="form-field"><strong>{t("website")}</strong><input type="url" placeholder="https://" value={profile.contact.website} onChange={(event) => setProfile((current) => ({ ...current, contact: { ...current.contact, website: event.target.value } }))} /></label>
      </div>
    </section>

    <section className="card profile-builder-section">
      <div className="profile-section-heading"><h2>{t("publications")}</h2><button className="btn btn-basic" onClick={() => setProfile((current) => ({ ...current, publications: [...current.publications, { id: newId(), title: "", citation: "", url: "" }] }))}>{t("addPublication")}</button></div>
      <div className="profile-editor-list">
        {profile.publications.map((publication, index) => <article className="profile-editor-item" key={publication.id}>
          <strong>{t("publicationNumber", { number: index + 1 })}</strong>
          <label className="form-field">{t("title")}<input value={publication.title} onChange={(event) => updatePublication(publication.id, { title: event.target.value })} /></label>
          <label className="form-field">{t("citation")}<textarea rows={3} value={publication.citation} onChange={(event) => updatePublication(publication.id, { citation: event.target.value })} /></label>
          <label className="form-field">{t("link")}<input type="url" placeholder="https://" value={publication.url} onChange={(event) => updatePublication(publication.id, { url: event.target.value })} /></label>
          <button className="btn btn-warning" onClick={() => setProfile((current) => ({ ...current, publications: current.publications.filter((item) => item.id !== publication.id) }))}>{t("remove")}</button>
        </article>)}
        {!profile.publications.length ? <p className="muted">{t("noPublications")}</p> : null}
      </div>
    </section>

    <section className="card profile-builder-section">
      <div className="profile-section-heading"><div><h2>{t("profileTiles")}</h2><p className="muted">{t("tilesHelp")}</p></div><div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}><button className="btn btn-basic" onClick={() => addTile("text")}>{t("addTextTile")}</button><button className="btn btn-basic" onClick={() => addTile("photo")}>{t("addPhotoTile")}</button></div></div>
      <div className="profile-tile-editor-grid">
        {profile.tiles.map((tile) => <article key={tile.id} className="profile-editor-item" onDragOver={(event) => event.preventDefault()} onDrop={() => dropTile(tile.id)}>
          <div className="profile-tile-drag"><span draggable onDragStart={() => setDraggedTileId(tile.id)}>{t("dragArrange")}</span><select value={tile.size} onChange={(event) => updateTile(tile.id, { size: event.target.value as ProfileTile["size"] })}><option value="standard">{t("standard")}</option><option value="wide">{t("wide")}</option><option value="large">{t("large")}</option></select></div>
          <label className="form-field">{t("tileTitle")}<input value={tile.title} onChange={(event) => updateTile(tile.id, { title: event.target.value })} /></label>
          {tile.type === "text" ? <label className="form-field">{t("text")}<textarea rows={5} value={tile.content} onChange={(event) => updateTile(tile.id, { content: event.target.value })} /></label> : <>
            <label className="form-field">{t("photo")}<input type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { updateTile(tile.id, { imageUrl: await resizePhoto(file) }); setStatus(null); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not process photo."); } }} /></label>
            {tile.imageUrl ? <img src={tile.imageUrl} alt={t("photo")} className="profile-tile-preview" /> : <div className="profile-photo-placeholder">{t("choosePhoto")}</div>}
            <label className="form-field">{t("caption")}<textarea rows={3} value={tile.content} onChange={(event) => updateTile(tile.id, { content: event.target.value })} /></label>
          </>}
          <button className="btn btn-warning" onClick={() => setProfile((current) => ({ ...current, tiles: current.tiles.filter((item) => item.id !== tile.id) }))}>{t("removeTile")}</button>
        </article>)}
        {!profile.tiles.length ? <p className="muted">{t("noTiles")}</p> : null}
      </div>
    </section>

    <div className="profile-save-bar">
      <button className="btn btn-basic" disabled={saving} onClick={save}>{saving ? t("saving") : t("saveProfile")}</button>
      {user.slug ? <Link className="btn btn-muted" href={`/people/${user.slug}`} target="_blank">{t("previewProfile")}</Link> : null}
      {status ? <span role="status">{status}</span> : null}
    </div>
  </div>;
}
