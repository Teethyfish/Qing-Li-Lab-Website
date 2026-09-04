"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { Area, Point } from "react-easy-crop";
import { useTranslations } from "next-intl";

type Props = {
  imageSrc: string;
  aspect: number;
  title: string;
  onComplete: (base64Image: string) => void;
  onCancel: () => void;
};

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function cropImage(imageSrc: string, crop: Area) {
  const source = await loadImage(imageSrc);
  const scale = Math.min(1, 1400 / crop.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);

  const encode = (quality: number) => canvas.toDataURL("image/jpeg", quality);
  let result = encode(0.8);
  if (result.length > 650_000) result = encode(0.62);
  if (result.length > 800_000) result = encode(0.46);
  if (result.length > 900_000) throw new Error("Cropped image is too large");
  return result;
}

export default function ProjectImageCropper({ imageSrc, aspect, title, onComplete, onCancel }: Props) {
  const t = useTranslations("editorTools");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const captureCrop = useCallback((_: Area, pixels: Area) => setCropPixels(pixels), []);
  const save = async () => {
    if (!cropPixels) return;
    setSaving(true);
    try {
      onComplete(await cropImage(imageSrc, cropPixels));
    } catch {
      setSaving(false);
    }
  };
  if (!mounted) return null;

  return createPortal(<>
    <div className="project-crop-backdrop" onClick={onCancel} />
    <section className="project-crop-modal" role="dialog" aria-modal="true" aria-labelledby="project-crop-title">
      <h2 id="project-crop-title">{title}</h2>
      <div className="project-crop-stage">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={captureCrop}
        />
      </div>
      <label className="project-crop-zoom"><span>{t("zoom")}</span><input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <p className="muted">{t("cropInstructions")}</p>
      <div className="project-crop-actions">
        <button type="button" className="btn btn-muted" disabled={saving} onClick={onCancel}>{t("cancel")}</button>
        <button type="button" className="btn btn-basic" disabled={saving || !cropPixels} onClick={save}>{saving ? t("saving") : t("saveCrop")}</button>
      </div>
    </section>
  </>, document.body);
}
