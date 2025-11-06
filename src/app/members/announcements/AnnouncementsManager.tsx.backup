"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BannerImageUpload from "@/components/BannerImageUpload";

type Announcement = {
  id: string;
  imageUrl: string;
  text: string;
  croppedArea: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  announcements: Announcement[];
  createAnnouncement: (formData: FormData) => Promise<void>;
  updateAnnouncement: (formData: FormData) => Promise<void>;
  deleteAnnouncement: (formData: FormData) => Promise<void>;
};

type TranslationWarning = {
  show: boolean;
  missingLanguages: string[];
  onConfirm: () => void;
  onCancel: () => void;
};

export default function AnnouncementsManager({
  announcements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
}: Props) {
  const t = useTranslations('announcements');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedArea, setCroppedArea] = useState<string | null>(null);

  // Language checkboxes
  const [enableChinese, setEnableChinese] = useState(false);
  const [enableKorean, setEnableKorean] = useState(false);

  // Warning dialog state
  const [warning, setWarning] = useState<TranslationWarning>({
    show: false,
    missingLanguages: [],
    onConfirm: () => {},
    onCancel: () => {},
  });

  const parseTranslations = (textJson: string) => {
    try {
      return JSON.parse(textJson);
    } catch {
      return { en: textJson };
    }
  };

  const validateTranslations = (formData: FormData): { valid: boolean; missing: string[] } => {
    const missing: string[] = [];
    const enableCh = formData.get("enableChinese") === "true";
    const enableKo = formData.get("enableKorean") === "true";
    const textEn = String(formData.get("text_en") || "").trim();
    const textZh = String(formData.get("text_zh") || "").trim();
    const textKo = String(formData.get("text_ko") || "").trim();

    if (!textEn) {
      missing.push("English");
    }
    if (enableCh && !textZh) {
      missing.push("Chinese");
    }
    if (enableKo && !textKo) {
      missing.push("Korean");
    }

    return { valid: missing.length === 0, missing };
  };

  const buildTextJson = (formData: FormData): string => {
    const translations: any = {
      en: String(formData.get("text_en") || "").trim(),
    };

    if (formData.get("enableChinese") === "true") {
      const zh = String(formData.get("text_zh") || "").trim();
      if (zh) translations.zh = zh;
    }

    if (formData.get("enableKorean") === "true") {
      const ko = String(formData.get("text_ko") || "").trim();
      if (ko) translations.ko = ko;
    }

    return JSON.stringify(translations);
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const validation = validateTranslations(formData);
    if (!validation.valid) {
      setWarning({
        show: true,
        missingLanguages: validation.missing,
        onConfirm: async () => {
          await submitCreate(formData);
          setWarning({ show: false, missingLanguages: [], onConfirm: () => {}, onCancel: () => {} });
        },
        onCancel: () => {
          setWarning({ show: false, missingLanguages: [], onConfirm: () => {}, onCancel: () => {} });
        },
      });
      return;
    }

    await submitCreate(formData);
  };

  const submitCreate = async (formData: FormData) => {
    const textJson = buildTextJson(formData);
    formData.set("text", textJson);

    if (croppedImage) {
      formData.set("imageBase64", croppedImage);
    }
    if (croppedArea) {
      formData.set("croppedArea", croppedArea);
    }

    await createAnnouncement(formData);
    setShowNewForm(false);
    setCroppedImage(null);
    setCroppedArea(null);
    setEnableChinese(false);
    setEnableKorean(false);
  };

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>, id: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", id);

    const validation = validateTranslations(formData);
    if (!validation.valid) {
      setWarning({
        show: true,
        missingLanguages: validation.missing,
        onConfirm: async () => {
          await submitUpdate(formData, id);
          setWarning({ show: false, missingLanguages: [], onConfirm: () => {}, onCancel: () => {} });
        },
        onCancel: () => {
          setWarning({ show: false, missingLanguages: [], onConfirm: () => {}, onCancel: () => {} });
        },
      });
      return;
    }

    await submitUpdate(formData, id);
  };

  const submitUpdate = async (formData: FormData, id: string) => {
    const textJson = buildTextJson(formData);
    formData.set("text", textJson);

    if (croppedImage) {
      formData.set("imageBase64", croppedImage);
    }
    if (croppedArea) {
      formData.set("croppedArea", croppedArea);
    }

    await updateAnnouncement(formData);
    setEditingId(null);
    setCroppedImage(null);
    setCroppedArea(null);
    setEnableChinese(false);
    setEnableKorean(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const formData = new FormData();
    formData.set("id", id);
    await deleteAnnouncement(formData);
  };

  const handleEdit = (announcement: Announcement) => {
    const translations = parseTranslations(announcement.text);
    setEditingId(announcement.id);
    setEnableChinese(!!translations.zh);
    setEnableKorean(!!translations.ko);
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
      <div style={{ display: "grid", gap: "1.5rem" }}>
        {/* Add new announcement button */}
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="btn btn-basic"
          >
            {t('addNew')}
          </button>
        )}

        {/* New announcement form */}
        {showNewForm && (
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
              {t('createNew')}
            </h2>
            <form onSubmit={handleCreateSubmit} style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "grid", gap: "0.4rem" }}>
                  <div style={{ fontWeight: 600 }}>{t('bannerImage')}</div>
                  <BannerImageUpload
                    currentImageUrl={null}
                    onImageCropped={(base64, area) => {
                      setCroppedImage(base64);
                      setCroppedArea(area ? JSON.stringify(area) : null);
                    }}
                  />
                </label>
              </div>

              {/* English text (required) */}
              <div>
                <label style={{ display: "grid", gap: "0.4rem" }}>
                  <div style={{ fontWeight: 600 }}>{t('overlayText')} (English) *</div>
                  <textarea
                    name="text_en"
                    rows={3}
                    required
                    placeholder="Enter English text..."
                    style={inputStyle}
                  />
                </label>
              </div>

              {/* Language options */}
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div style={{ fontWeight: 600 }}>Additional Languages</div>

                {/* Chinese checkbox */}
                <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={enableChinese}
                    onChange={(e) => setEnableChinese(e.target.checked)}
                  />
                  <span>Chinese (中文)</span>
                </label>
                {enableChinese && (
                  <textarea
                    name="text_zh"
                    rows={3}
                    placeholder="输入中文文字..."
                    style={inputStyle}
                  />
                )}

                {/* Korean checkbox */}
                <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={enableKorean}
                    onChange={(e) => setEnableKorean(e.target.checked)}
                  />
                  <span>Korean (한국어)</span>
                </label>
                {enableKorean && (
                  <textarea
                    name="text_ko"
                    rows={3}
                    placeholder="한국어 텍스트를 입력하세요..."
                    style={inputStyle}
                  />
                )}
              </div>

              <input type="hidden" name="enableChinese" value={enableChinese ? "true" : "false"} />
              <input type="hidden" name="enableKorean" value={enableKorean ? "true" : "false"} />

              <div>
                <label style={{ display: "grid", gap: "0.4rem" }}>
                  <div style={{ fontWeight: 600 }}>{t('displayOrder')}</div>
                  <input
                    name="order"
                    type="number"
                    defaultValue={0}
                    style={inputStyle}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn btn-basic">
                  {t('create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewForm(false);
                    setCroppedImage(null);
                    setCroppedArea(null);
                    setEnableChinese(false);
                    setEnableKorean(false);
                  }}
                  className="btn btn-muted"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing announcements */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {announcements.map((announcement) => {
            const translations = parseTranslations(announcement.text);

            return (
              <div key={announcement.id} className="card" style={{ padding: "1.5rem" }}>
                {editingId === announcement.id ? (
                  <form
                    onSubmit={(e) => handleUpdateSubmit(e, announcement.id)}
                    style={{ display: "grid", gap: "1rem" }}
                  >
                    <div>
                      <label style={{ display: "grid", gap: "0.4rem" }}>
                        <div style={{ fontWeight: 600 }}>{t('bannerImage')}</div>
                        <BannerImageUpload
                          currentImageUrl={announcement.imageUrl}
                          onImageCropped={(base64, area) => {
                            setCroppedImage(base64);
                            setCroppedArea(area ? JSON.stringify(area) : null);
                          }}
                        />
                      </label>
                    </div>

                    {/* English text (required) */}
                    <div>
                      <label style={{ display: "grid", gap: "0.4rem" }}>
                        <div style={{ fontWeight: 600 }}>{t('overlayText')} (English) *</div>
                        <textarea
                          name="text_en"
                          rows={3}
                          required
                          defaultValue={translations.en || ""}
                          style={inputStyle}
                        />
                      </label>
                    </div>

                    {/* Language options */}
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      <div style={{ fontWeight: 600 }}>Additional Languages</div>

                      {/* Chinese checkbox */}
                      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={enableChinese}
                          onChange={(e) => setEnableChinese(e.target.checked)}
                        />
                        <span>Chinese (中文)</span>
                      </label>
                      {enableChinese && (
                        <textarea
                          name="text_zh"
                          rows={3}
                          defaultValue={translations.zh || ""}
                          placeholder="输入中文文字..."
                          style={inputStyle}
                        />
                      )}

                      {/* Korean checkbox */}
                      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={enableKorean}
                          onChange={(e) => setEnableKorean(e.target.checked)}
                        />
                        <span>Korean (한국어)</span>
                      </label>
                      {enableKorean && (
                        <textarea
                          name="text_ko"
                          rows={3}
                          defaultValue={translations.ko || ""}
                          placeholder="한국어 텍스트를 입력하세요..."
                          style={inputStyle}
                        />
                      )}
                    </div>

                    <input type="hidden" name="enableChinese" value={enableChinese ? "true" : "false"} />
                    <input type="hidden" name="enableKorean" value={enableKorean ? "true" : "false"} />

                    <div>
                      <label style={{ display: "grid", gap: "0.4rem" }}>
                        <div style={{ fontWeight: 600 }}>{t('displayOrder')}</div>
                        <input
                          name="order"
                          type="number"
                          defaultValue={announcement.order}
                          style={inputStyle}
                        />
                      </label>
                    </div>

                    <div>
                      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          name="isActive"
                          type="checkbox"
                          value="true"
                          defaultChecked={announcement.isActive}
                        />
                        <span style={{ fontWeight: 600 }}>{t('active')}</span>
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="submit" className="btn btn-basic">
                        {t('save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setCroppedImage(null);
                          setCroppedArea(null);
                          setEnableChinese(false);
                          setEnableKorean(false);
                        }}
                        className="btn btn-muted"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "start" }}>
                      <img
                        src={announcement.imageUrl}
                        alt={translations.en}
                        style={{
                          width: 200,
                          height: 100,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                          {translations.en}
                        </div>
                        <div style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                          {translations.zh && (
                            <div className="muted">🇨🇳 {translations.zh}</div>
                          )}
                          {translations.ko && (
                            <div className="muted">🇰🇷 {translations.ko}</div>
                          )}
                        </div>
                        <div className="muted" style={{ fontSize: "0.875rem" }}>
                          {t('order')}: {announcement.order} • {announcement.isActive ? t('active') : t('inactive')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="btn btn-basic"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="btn btn-warning"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {announcements.length === 0 && !showNewForm && (
            <div className="muted" style={{ textAlign: "center", padding: "2rem" }}>
              {t('noAnnouncements')}
            </div>
          )}
        </div>
      </div>

      {/* Warning Dialog */}
      {warning.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={warning.onCancel}
        >
          <div
            className="card"
            style={{
              padding: "2rem",
              maxWidth: 500,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
              Missing Translations
            </h3>
            <p style={{ marginBottom: "1.5rem", lineHeight: 1.6 }}>
              The following language translations are missing or empty:
              <strong> {warning.missingLanguages.join(", ")}</strong>.
              <br /><br />
              Do you want to save anyway?
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={warning.onCancel}
                className="btn btn-muted"
              >
                Go Back
              </button>
              <button
                onClick={warning.onConfirm}
                className="btn btn-warning"
              >
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
