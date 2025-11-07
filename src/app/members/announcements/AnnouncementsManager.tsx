"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BannerImageUpload from "@/components/BannerImageUpload";

type Announcement = {
  id: string;
  imageUrl: string;
  title: string;
  text: string;
  croppedArea: string | null;
  order: number;
  status: string;
  hasDetailsPage: boolean;
  detailsSlug: string | null;
  detailsContent: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  activeAnnouncements: Announcement[];
  archivedAnnouncements: Announcement[];
  createAnnouncement: (formData: FormData) => Promise<void>;
  updateAnnouncement: (formData: FormData) => Promise<void>;
  archiveAnnouncement: (formData: FormData) => Promise<void>;
  unarchiveAnnouncement: (formData: FormData) => Promise<void>;
  deleteAnnouncement: (formData: FormData) => Promise<void>;
};

type TranslationWarning = {
  show: boolean;
  missingLanguages: string[];
  onConfirm: () => void;
  onCancel: () => void;
};

export default function AnnouncementsManager({
  activeAnnouncements,
  archivedAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
  unarchiveAnnouncement,
  deleteAnnouncement,
}: Props) {
  const t = useTranslations('announcements');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedArea, setCroppedArea] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Language checkboxes
  const [enableChinese, setEnableChinese] = useState(false);
  const [enableKorean, setEnableKorean] = useState(false);

  // Details page options
  const [hasDetailsPage, setHasDetailsPage] = useState(false);

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

    // Check title
    const titleEn = String(formData.get("title_en") || "").trim();
    const titleZh = String(formData.get("title_zh") || "").trim();
    const titleKo = String(formData.get("title_ko") || "").trim();

    // Check text
    const textEn = String(formData.get("text_en") || "").trim();
    const textZh = String(formData.get("text_zh") || "").trim();
    const textKo = String(formData.get("text_ko") || "").trim();

    if (!titleEn || !textEn) {
      missing.push("English");
    }
    if (enableCh && (!titleZh || !textZh)) {
      missing.push("Chinese");
    }
    if (enableKo && (!titleKo || !textKo)) {
      missing.push("Korean");
    }

    return { valid: missing.length === 0, missing };
  };

  const buildTitleJson = (formData: FormData): string => {
    const translations: any = {
      en: String(formData.get("title_en") || "").trim(),
    };

    if (formData.get("enableChinese") === "true") {
      const zh = String(formData.get("title_zh") || "").trim();
      if (zh) translations.zh = zh;
    }

    if (formData.get("enableKorean") === "true") {
      const ko = String(formData.get("title_ko") || "").trim();
      if (ko) translations.ko = ko;
    }

    return JSON.stringify(translations);
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

  const buildDetailsJson = (formData: FormData): string | null => {
    if (formData.get("hasDetailsPage") !== "true") return null;

    const translations: any = {
      en: String(formData.get("details_en") || "").trim(),
    };

    if (formData.get("enableChinese") === "true") {
      const zh = String(formData.get("details_zh") || "").trim();
      if (zh) translations.zh = zh;
    }

    if (formData.get("enableKorean") === "true") {
      const ko = String(formData.get("details_ko") || "").trim();
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
    const titleJson = buildTitleJson(formData);
    const textJson = buildTextJson(formData);
    const detailsJson = buildDetailsJson(formData);

    formData.set("title", titleJson);
    formData.set("text", textJson);
    if (detailsJson) {
      formData.set("detailsContent", detailsJson);
    }

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
    setHasDetailsPage(false);
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
    const titleJson = buildTitleJson(formData);
    const textJson = buildTextJson(formData);
    const detailsJson = buildDetailsJson(formData);

    formData.set("title", titleJson);
    formData.set("text", textJson);
    if (detailsJson) {
      formData.set("detailsContent", detailsJson);
    }

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
    setHasDetailsPage(false);
  };

  const handleDelete = async (id: string, hasDetails: boolean) => {
    const message = hasDetails
      ? "Are you sure you want to delete this announcement? This will remove both the banner and the details page."
      : "Are you sure you want to delete this announcement?";

    if (!confirm(message)) return;

    const formData = new FormData();
    formData.set("id", id);
    await deleteAnnouncement(formData);
  };

  const handleArchive = async (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    await archiveAnnouncement(formData);
  };

  const handleUnarchive = async (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    await unarchiveAnnouncement(formData);
  };

  const handleEdit = (announcement: Announcement) => {
    const titleTranslations = parseTranslations(announcement.title);
    const textTranslations = parseTranslations(announcement.text);
    setEditingId(announcement.id);
    setEnableChinese(!!textTranslations.zh || !!titleTranslations.zh);
    setEnableKorean(!!textTranslations.ko || !!titleTranslations.ko);
    setHasDetailsPage(announcement.hasDetailsPage);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.7rem",
    borderRadius: 10,
    border: "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
    background: "var(--color-card)",
    boxSizing: "border-box",
  };

  const currentAnnouncements = activeTab === "active" ? activeAnnouncements : archivedAnnouncements;

  return (
    <>
      <div style={{ display: "grid", gap: "1.5rem" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid color-mix(in oklab, var(--color-text) 10%, transparent)" }}>
          <button
            onClick={() => setActiveTab("active")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "active" ? "2px solid var(--color-text)" : "2px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
              fontWeight: activeTab === "active" ? 600 : 400,
              color: activeTab === "active" ? "var(--color-text)" : "color-mix(in oklab, var(--color-text) 60%, transparent)",
            }}
          >
            Active ({activeAnnouncements.length})
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "archived" ? "2px solid var(--color-text)" : "2px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
              fontWeight: activeTab === "archived" ? 600 : 400,
              color: activeTab === "archived" ? "var(--color-text)" : "color-mix(in oklab, var(--color-text) 60%, transparent)",
            }}
          >
            Archived ({archivedAnnouncements.length})
          </button>
        </div>

        {/* Add new announcement button */}
        {!showNewForm && activeTab === "active" && (
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

              {/* Title (required) */}
              <div>
                <label style={{ display: "grid", gap: "0.4rem" }}>
                  <div style={{ fontWeight: 600 }}>Title (English) *</div>
                  <input
                    name="title_en"
                    type="text"
                    required
                    placeholder="Enter announcement title..."
                    style={inputStyle}
                  />
                </label>
              </div>

              {/* Subtitle/Text (required) */}
              <div>
                <label style={{ display: "grid", gap: "0.4rem" }}>
                  <div style={{ fontWeight: 600 }}>Subtitle (English) *</div>
                  <textarea
                    name="text_en"
                    rows={2}
                    required
                    placeholder="Enter subtitle text..."
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
                  <div style={{ display: "grid", gap: "0.75rem", marginLeft: "1.5rem" }}>
                    <input
                      name="title_zh"
                      type="text"
                      placeholder="输入中文标题..."
                      style={inputStyle}
                    />
                    <textarea
                      name="text_zh"
                      rows={2}
                      placeholder="输入中文副标题..."
                      style={inputStyle}
                    />
                  </div>
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
                  <div style={{ display: "grid", gap: "0.75rem", marginLeft: "1.5rem" }}>
                    <input
                      name="title_ko"
                      type="text"
                      placeholder="한국어 제목을 입력하세요..."
                      style={inputStyle}
                    />
                    <textarea
                      name="text_ko"
                      rows={2}
                      placeholder="한국어 부제를 입력하세요..."
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              <input type="hidden" name="enableChinese" value={enableChinese ? "true" : "false"} />
              <input type="hidden" name="enableKorean" value={enableKorean ? "true" : "false"} />

              {/* Details page options */}
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={hasDetailsPage}
                    onChange={(e) => setHasDetailsPage(e.target.checked)}
                  />
                  <span style={{ fontWeight: 600 }}>Enable Details Page</span>
                </label>

                {hasDetailsPage && (
                  <div style={{ display: "grid", gap: "0.75rem", marginLeft: "1.5rem" }}>
                    <div>
                      <label style={{ display: "grid", gap: "0.4rem" }}>
                        <div style={{ fontWeight: 600 }}>URL Slug *</div>
                        <input
                          name="detailsSlug"
                          type="text"
                          required={hasDetailsPage}
                          placeholder="e.g., summer-symposium-2024"
                          style={inputStyle}
                        />
                        <div className="muted" style={{ fontSize: "0.85rem" }}>
                          Will be accessible at: /announcements/[your-slug]
                        </div>
                      </label>
                    </div>

                    <div>
                      <label style={{ display: "grid", gap: "0.4rem" }}>
                        <div style={{ fontWeight: 600 }}>Details Content (English) *</div>
                        <textarea
                          name="details_en"
                          rows={4}
                          required={hasDetailsPage}
                          placeholder="Enter detailed content..."
                          style={inputStyle}
                        />
                      </label>
                    </div>

                    {enableChinese && (
                      <div>
                        <label style={{ display: "grid", gap: "0.4rem" }}>
                          <div style={{ fontWeight: 600 }}>Details Content (Chinese)</div>
                          <textarea
                            name="details_zh"
                            rows={4}
                            placeholder="输入详细内容..."
                            style={inputStyle}
                          />
                        </label>
                      </div>
                    )}

                    {enableKorean && (
                      <div>
                        <label style={{ display: "grid", gap: "0.4rem" }}>
                          <div style={{ fontWeight: 600 }}>Details Content (Korean)</div>
                          <textarea
                            name="details_ko"
                            rows={4}
                            placeholder="자세한 내용을 입력하세요..."
                            style={inputStyle}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <input type="hidden" name="hasDetailsPage" value={hasDetailsPage ? "true" : "false"} />

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
                    setHasDetailsPage(false);
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
          {currentAnnouncements.map((announcement) => {
            const titleTranslations = parseTranslations(announcement.title);
            const textTranslations = parseTranslations(announcement.text);

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

                    {/* Title (required) */}
                    <div>
                      <label style={{ display: "grid", gap: "0.4rem" }}>
                        <div style={{ fontWeight: 600 }}>Title (English) *</div>
                        <input
                          name="title_en"
                          type="text"
                          required
                          defaultValue={titleTranslations.en || ""}
                          placeholder="Enter announcement title..."
                          style={inputStyle}
                        />
                      </label>
                    </div>

                    {/* English text (required) */}
                    <div>
                      <label style={{ display: "grid", gap: "0.4rem" }}>
                        <div style={{ fontWeight: 600 }}>Subtitle (English) *</div>
                        <textarea
                          name="text_en"
                          rows={2}
                          required
                          defaultValue={textTranslations.en || ""}
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
                        <div style={{ display: "grid", gap: "0.75rem", marginLeft: "1.5rem" }}>
                          <input
                            name="title_zh"
                            type="text"
                            defaultValue={titleTranslations.zh || ""}
                            placeholder="输入中文标题..."
                            style={inputStyle}
                          />
                          <textarea
                            name="text_zh"
                            rows={2}
                            defaultValue={textTranslations.zh || ""}
                            placeholder="输入中文副标题..."
                            style={inputStyle}
                          />
                        </div>
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
                        <div style={{ display: "grid", gap: "0.75rem", marginLeft: "1.5rem" }}>
                          <input
                            name="title_ko"
                            type="text"
                            defaultValue={titleTranslations.ko || ""}
                            placeholder="한국어 제목을 입력하세요..."
                            style={inputStyle}
                          />
                          <textarea
                            name="text_ko"
                            rows={2}
                            defaultValue={textTranslations.ko || ""}
                            placeholder="한국어 부제를 입력하세요..."
                            style={inputStyle}
                          />
                        </div>
                      )}
                    </div>

                    <input type="hidden" name="enableChinese" value={enableChinese ? "true" : "false"} />
                    <input type="hidden" name="enableKorean" value={enableKorean ? "true" : "false"} />

                    {/* Details page options */}
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={hasDetailsPage}
                          onChange={(e) => setHasDetailsPage(e.target.checked)}
                        />
                        <span style={{ fontWeight: 600 }}>Enable Details Page</span>
                      </label>

                      {hasDetailsPage && (
                        <div style={{ display: "grid", gap: "0.75rem", marginLeft: "1.5rem" }}>
                          <div>
                            <label style={{ display: "grid", gap: "0.4rem" }}>
                              <div style={{ fontWeight: 600 }}>URL Slug *</div>
                              <input
                                name="detailsSlug"
                                type="text"
                                required={hasDetailsPage}
                                defaultValue={announcement.detailsSlug || ""}
                                placeholder="e.g., summer-symposium-2024"
                                style={inputStyle}
                              />
                            </label>
                          </div>

                          <div>
                            <label style={{ display: "grid", gap: "0.4rem" }}>
                              <div style={{ fontWeight: 600 }}>Details Content (English) *</div>
                              <textarea
                                name="details_en"
                                rows={4}
                                required={hasDetailsPage}
                                defaultValue={announcement.detailsContent ? parseTranslations(announcement.detailsContent).en : ""}
                                placeholder="Enter detailed content..."
                                style={inputStyle}
                              />
                            </label>
                          </div>

                          {enableChinese && (
                            <div>
                              <label style={{ display: "grid", gap: "0.4rem" }}>
                                <div style={{ fontWeight: 600 }}>Details Content (Chinese)</div>
                                <textarea
                                  name="details_zh"
                                  rows={4}
                                  defaultValue={announcement.detailsContent ? parseTranslations(announcement.detailsContent).zh : ""}
                                  placeholder="输入详细内容..."
                                  style={inputStyle}
                                />
                              </label>
                            </div>
                          )}

                          {enableKorean && (
                            <div>
                              <label style={{ display: "grid", gap: "0.4rem" }}>
                                <div style={{ fontWeight: 600 }}>Details Content (Korean)</div>
                                <textarea
                                  name="details_ko"
                                  rows={4}
                                  defaultValue={announcement.detailsContent ? parseTranslations(announcement.detailsContent).ko : ""}
                                  placeholder="자세한 내용을 입력하세요..."
                                  style={inputStyle}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <input type="hidden" name="hasDetailsPage" value={hasDetailsPage ? "true" : "false"} />

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
                          setHasDetailsPage(false);
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
                        alt={titleTranslations.en}
                        style={{
                          width: 200,
                          height: 100,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                          {titleTranslations.en}
                        </div>
                        <div style={{ marginBottom: "0.5rem" }}>
                          {textTranslations.en}
                        </div>
                        <div style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                          {titleTranslations.zh && (
                            <div className="muted">🇨🇳 {titleTranslations.zh}: {textTranslations.zh}</div>
                          )}
                          {titleTranslations.ko && (
                            <div className="muted">🇰🇷 {titleTranslations.ko}: {textTranslations.ko}</div>
                          )}
                        </div>
                        <div className="muted" style={{ fontSize: "0.875rem" }}>
                          {t('order')}: {announcement.order}
                          {announcement.hasDetailsPage && ` • Details: /announcements/${announcement.detailsSlug}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="btn btn-basic"
                      >
                        {t('edit')}
                      </button>
                      {activeTab === "active" ? (
                        <button
                          onClick={() => handleArchive(announcement.id)}
                          className="btn btn-muted"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnarchive(announcement.id)}
                          className="btn btn-basic"
                        >
                          Unarchive
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(announcement.id, announcement.hasDetailsPage)}
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

          {currentAnnouncements.length === 0 && !showNewForm && (
            <div className="muted" style={{ textAlign: "center", padding: "2rem" }}>
              {activeTab === "active" ? t('noAnnouncements') : "No archived announcements."}
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
