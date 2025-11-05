"use client";

import { useState, useRef } from "react";
import ProfilePictureCropper from "./ProfilePictureCropper";

type Props = {
  currentImageUrl?: string | null;
  userName?: string | null;
  onImageCropped: (base64Image: string) => void;
};

function initials(name?: string | null) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "??";
}

export default function ProfilePictureUpload({ currentImageUrl, userName, onImageCropped }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Convert blob to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      onImageCropped(base64);
      setImageSrc(null);
    };
    reader.readAsDataURL(croppedBlob);
  };

  const handleCropCancel = () => {
    setImageSrc(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageClick = () => {
    // If there's an existing image, open it in the cropper
    if (previewUrl) {
      setImageSrc(previewUrl);
    }
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
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          type="button"
          onClick={handleImageClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          disabled={!previewUrl}
          style={{
            width: 80,
            height: 80,
            borderRadius: "9999px",
            overflow: "hidden",
            border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "color-mix(in oklab, var(--color-text) 6%, #f3f4f6)",
            color: "var(--color-text)",
            fontWeight: 600,
            flexShrink: 0,
            position: "relative",
            cursor: previewUrl ? "pointer" : "default",
            padding: 0,
          }}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {/* Overlay on hover */}
              {isHovering && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0, 0, 0, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  Edit
                </div>
              )}
            </>
          ) : (
            <span style={{ fontSize: "1.5rem" }}>{initials(userName)}</span>
          )}
        </button>
        <div style={{ flex: 1 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={inputStyle}
          />
          <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>
            {previewUrl
              ? "Upload a new picture or click your photo to re-crop"
              : "Upload a new profile picture (JPG, PNG, etc.)"}
          </div>
        </div>
      </div>

      {/* Cropper modal */}
      {imageSrc && (
        <ProfilePictureCropper
          imageSrc={imageSrc}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
