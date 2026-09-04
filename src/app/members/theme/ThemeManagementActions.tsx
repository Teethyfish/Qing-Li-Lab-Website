"use client";

type Props = {
  presetId: string;
  currentName: string;
  canDelete: boolean;
  renameAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  labels: {
    rename: string;
    name: string;
    saveName: string;
    delete: string;
    confirmDelete: string;
    protectedTheme: string;
  };
};

export default function ThemeManagementActions({
  presetId,
  currentName,
  canDelete,
  renameAction,
  deleteAction,
  labels,
}: Props) {
  return (
    <section className="tile theme-save-panel">
      <div>
        <h2>{labels.rename}</h2>
      </div>

      <form action={renameAction} className="theme-new-fields">
        <input type="hidden" name="presetId" value={presetId} />
        <label>
          <strong>{labels.name}</strong>
          <input name="themeName" defaultValue={currentName} required maxLength={80} />
        </label>
        <div className="theme-editor-actions">
          <button className="btn btn-basic" type="submit">{labels.saveName}</button>
        </div>
      </form>

      {canDelete ? (
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm(labels.confirmDelete)) event.preventDefault();
          }}
        >
          <input type="hidden" name="presetId" value={presetId} />
          <button className="btn btn-warning" type="submit">{labels.delete}</button>
        </form>
      ) : (
        <p className="muted" style={{ margin: 0 }}>{labels.protectedTheme}</p>
      )}
    </section>
  );
}
