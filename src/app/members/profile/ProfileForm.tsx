"use client";

import { useState } from "react";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";

type Props = {
  user: {
    email: string;
    name: string | null;
    about: string | null;
    imageUrl: string | null;
  };
  saveProfile: (formData: FormData) => Promise<void>;
};

export default function ProfileForm({ user, saveProfile }: Props) {
  const [croppedImage, setCroppedImage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Add the cropped image if it exists
    if (croppedImage) {
      formData.set("imageBase64", croppedImage);
    }

    await saveProfile(formData);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.7rem",
    borderRadius: 10,
    border: "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
    background: "var(--color-card)",
    boxSizing: "border-box",
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" style={{ gridTemplateColumns: "1fr" }}>
      <input type="hidden" name="email" value={user.email} />

      {/* Profile Picture */}
      <div className="tile" style={{ padding: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Profile picture</div>
        <ProfilePictureUpload
          currentImageUrl={user.imageUrl}
          userName={user.name}
          onImageCropped={setCroppedImage}
        />
      </div>

      {/* Name */}
      <div className="tile" style={{ padding: "1rem" }}>
        <label style={{ display: "grid", gap: "0.4rem" }}>
          <div style={{ fontWeight: 600 }}>Display name</div>
          <input
            name="name"
            defaultValue={user.name ?? ""}
            placeholder="e.g. Lynn Zhang"
            style={inputStyle}
          />
        </label>
      </div>

      {/* About */}
      <div className="tile" style={{ padding: "1rem" }}>
        <label style={{ display: "grid", gap: "0.4rem" }}>
          <div style={{ fontWeight: 600 }}>About me</div>
          <textarea
            name="about"
            defaultValue={user.about ?? ""}
            rows={6}
            placeholder="A short bio, research interests, etc."
            style={inputStyle}
          />
        </label>
      </div>

      <div>
        <button className="btn btn-basic" type="submit">
          Save changes
        </button>
      </div>
    </form>
  );
}
