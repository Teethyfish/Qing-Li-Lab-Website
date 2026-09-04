"use client";

import { useState, useRef } from "react";
import BannerImageCropper from "./BannerImageCropper";
import { Area } from "react-easy-crop";
import {
  BANNER_RECOMMENDED_HEIGHT,
  BANNER_RECOMMENDED_WIDTH,
} from "@/lib/banner";
import { useTranslations } from "next-intl";

type Props = {
  currentImageUrl?: string | null;
  onImageCropped: (base64Image: string, croppedArea: Area | null) => void;
};

export default function BannerImageUpload({ currentImageUrl, onImageCropped }: Props) {
  const t = useTranslations('editorTools');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check image dimensions and warn if too small
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (
          img.width < BANNER_RECOMMENDED_WIDTH ||
          img.height < BANNER_RECOMMENDED_HEIGHT
        ) {
          const proceed = confirm(t('smallBannerWarning', {
            width: img.width,
            height: img.height,
            recommendedWidth: BANNER_RECOMMENDED_WIDTH,
            recommendedHeight: BANNER_RECOMMENDED_HEIGHT,
          }));
          if (!proceed) {
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            return;
          }
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
              height: 250,
              borderRadius: 2,
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
            {/* Local blob/data URL preview; Next Image cannot optimize it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={t('bannerPreview')}
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
                {t('clickToRecrop')}
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
              ? t('uploadNewBanner')
              : t('uploadBanner', {width: BANNER_RECOMMENDED_WIDTH, height: BANNER_RECOMMENDED_HEIGHT})}
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
