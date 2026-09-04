"use client";

import { useState } from "react";
import { useEditMode } from "@/contexts/EditModeContext";
import AdminRichTextToolbar from "@/components/AdminRichTextToolbar";
import { useTranslations } from "next-intl";

export default function EditModeSaveBar() {
  const t = useTranslations('editorTools');
  const { isEditMode, setIsEditMode, editedContent, resetContent } = useEditMode();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isEditMode) return null;

  const hasChanges = Object.keys(editedContent).length > 0;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/content/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedContent }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || t('saveFailed', {status: response.status}));
      }

      setSuccess(true);
      resetContent();
      setTimeout(() => {
        setSuccess(false);
        setIsEditMode(false);
        window.location.reload(); // Reload to show saved content
      }, 1500);
    } catch (err: any) {
      setError(err.message || t('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges && !confirm(t('confirmCancel'))) {
      return;
    }
    resetContent();
    setIsEditMode(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--btn-warning-bg, #f59e0b)",
        borderTop: "2px solid var(--btn-warning-hover-bg, #d97706)",
        padding: "1rem",
        zIndex: 1000,
        display: "grid",
        alignItems: "center",
        justifyContent: "stretch",
        gap: "1rem",
        boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      <AdminRichTextToolbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
          {hasChanges
            ? t('changesPending', {count: Object.keys(editedContent).length})
            : t('editModeActive')}
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="btn btn-basic"
            style={{
              minWidth: "100px",
              opacity: !hasChanges || saving ? 0.6 : 1,
            }}
          >
            {saving ? t('saving') : success ? t('savedShort') : t('saveChanges')}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="btn btn-muted"
            style={{ minWidth: "80px" }}
          >
            {t('cancel')}
          </button>
        </div>

        {error && <div style={{ color: "#fff", fontSize: "0.85rem" }}>❌ {error}</div>}
        {success && <div style={{ color: "#fff", fontSize: "0.85rem" }}>✅ {t('savedSuccessfully')}</div>}
      </div>
    </div>
  );
}
