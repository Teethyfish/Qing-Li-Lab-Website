"use client";

import { useState } from "react";
import { useEditMode } from "@/contexts/EditModeContext";

export default function EditModeSaveBar() {
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      setSuccess(true);
      resetContent();
      setTimeout(() => {
        setSuccess(false);
        setIsEditMode(false);
        window.location.reload(); // Reload to show saved content
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges && !confirm("You have unsaved changes. Are you sure you want to cancel?")) {
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
        {hasChanges
          ? `${Object.keys(editedContent).length} change${Object.keys(editedContent).length === 1 ? "" : "s"} pending`
          : "Edit Mode Active - Click any text to edit"}
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
          {saving ? "Saving..." : success ? "Saved!" : "Save Changes"}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="btn btn-muted"
          style={{ minWidth: "80px" }}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div style={{ color: "#fff", fontSize: "0.85rem", marginLeft: "1rem" }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div style={{ color: "#fff", fontSize: "0.85rem", marginLeft: "1rem" }}>
          ✅ Saved successfully!
        </div>
      )}
    </div>
  );
}
