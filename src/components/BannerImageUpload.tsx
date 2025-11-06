"use client";

import { useState, useRef } from "react";
import BannerImageCropper from "./BannerImageCropper";
import { Area } from "react-easy-crop";

type Props = {
  currentImageUrl?: string | null;
  onImageCropped: (base64Image: string, croppedArea: Area | null) => void;
};

export default function BannerImageUpload({ currentImageUrl, onImageCropped }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("Image file is too large. Maximum size is 10MB.");
      return;
    }

    // Validate image dimensions (minimum 1200x400)
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 1200 || img.height < 400) {
          alert("Image is too small. Minimum dimensions are 1200x400 pixels.");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }
        setImageSrc(reader.result as string);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob, croppedArea: Area) => {
    // Convert blob to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      onImageCropped(base64, croppedArea);
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
      <div style={{ display: "grid", gap: "1rem" }}>
        {/* Preview */}
        {previewUrl && (
          <button
            type="button"
            onClick={handleImageClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{
              width: "100%",
              maxWidth: 600,
              height: 200,
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: "pointer",
              padding: 0,
              background: "transparent",
            }}
          >
            <img
              src={previewUrl}
              alt="Banner preview"
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
                  fontSize: "1rem",
                  fontWeight: 600,
                }}
              >
                Click to re-crop
              </div>
            )}
          </button>
        )}

        {/* File input */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={inputStyle}
            required={!previewUrl}
          />
          <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>
            {previewUrl
              ? "Upload a new image or click the preview to re-crop"
              : "Upload a banner image (min 1200x400px, max 10MB)"}
          </div>
        </div>
      </div>

      {/* Cropper modal */}
      {imageSrc && (
        <BannerImageCropper
          imageSrc={imageSrc}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
