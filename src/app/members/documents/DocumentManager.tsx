"use client";

import Link from "next/link";
import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ReplaceDocumentFileForm from "./ReplaceDocumentFileForm";

type Category = { id: string; name: string; slug: string; sortOrder: number };
type DocumentRecord = {
  id: string;
  title: string;
  description: string;
  emailSubject: string;
  isPublic: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  recipients: Array<{ name: string | null; email: string }>;
};

export default function DocumentManager({ initialCategories, initialDocuments, uploadForm }: { initialCategories: Category[]; initialDocuments: DocumentRecord[]; uploadForm?: ReactNode }) {
  const t = useTranslations("sitePages.documentsAdmin");
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [documents, setDocuments] = useState(initialDocuments);
  const [newCategory, setNewCategory] = useState("");
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>(() => Object.fromEntries(initialCategories.map((category) => [category.id, category.name])));
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>(() => Object.fromEntries(initialDocuments.map((document) => [document.id, document.categoryId || ""])));
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [deleteConfirmations, setDeleteConfirmations] = useState<Record<string, string>>({});

  useEffect(() => {
    setCategories(initialCategories);
    setCategoryNames(Object.fromEntries(initialCategories.map((category) => [category.id, category.name])));
  }, [initialCategories]);

  useEffect(() => {
    setDocuments(initialDocuments);
    setSelectedCategories(Object.fromEntries(initialDocuments.map((document) => [document.id, document.categoryId || ""])));
  }, [initialDocuments]);

  const request = async (url: string, options: RequestInit) => {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json" } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || t("saveFailed"));
    return result;
  };

  const addCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCategory.trim()) return;
    setBusyKey("category-new");
    setStatuses((current) => ({ ...current, categories: "" }));
    try {
      const result = await request("/api/document-categories", { method: "POST", body: JSON.stringify({ name: newCategory }) });
      const category = result.category as Category;
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryNames((current) => ({ ...current, [category.id]: category.name }));
      setNewCategory("");
      setStatuses((current) => ({ ...current, categories: t("categoryCreated") }));
      router.refresh();
    } catch (error) {
      setStatuses((current) => ({ ...current, categories: error instanceof Error ? error.message : t("saveFailed") }));
    } finally { setBusyKey(null); }
  };

  const renameCategory = async (id: string) => {
    setBusyKey(`category-${id}`);
    try {
      const result = await request(`/api/document-categories/${id}`, { method: "PATCH", body: JSON.stringify({ name: categoryNames[id] }) });
      const category = result.category as Category;
      setCategories((current) => current.map((item) => item.id === id ? category : item).sort((a, b) => a.name.localeCompare(b.name)));
      setDocuments((current) => current.map((document) => document.categoryId === id ? { ...document, category: { id, name: category.name } } : document));
      setStatuses((current) => ({ ...current, categories: t("categoryRenamed") }));
      router.refresh();
    } catch (error) {
      setStatuses((current) => ({ ...current, categories: error instanceof Error ? error.message : t("saveFailed") }));
    } finally { setBusyKey(null); }
  };

  const removeCategory = async (category: Category) => {
    if (!window.confirm(t("confirmDeleteCategory", { name: category.name }))) return;
    setBusyKey(`category-${category.id}`);
    try {
      await request(`/api/document-categories/${category.id}`, { method: "DELETE" });
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setDocuments((current) => current.map((document) => document.categoryId === category.id ? { ...document, categoryId: null, category: null } : document));
      setSelectedCategories((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, value === category.id ? "" : value])));
      setStatuses((current) => ({ ...current, categories: t("categoryDeleted") }));
      router.refresh();
    } catch (error) {
      setStatuses((current) => ({ ...current, categories: error instanceof Error ? error.message : t("saveFailed") }));
    } finally { setBusyKey(null); }
  };

  const saveCategoryAssignment = async (document: DocumentRecord) => {
    const key = `document-${document.id}`;
    setBusyKey(key);
    setStatuses((current) => ({ ...current, [document.id]: t("saving") }));
    try {
      const result = await request(`/api/documents/${document.id}`, { method: "PATCH", body: JSON.stringify({ categoryId: selectedCategories[document.id] || null }) });
      const saved = result.document as DocumentRecord;
      setDocuments((current) => current.map((item) => item.id === document.id ? { ...item, categoryId: saved.categoryId, category: saved.category } : item));
      setStatuses((current) => ({ ...current, [document.id]: t("saved") }));
      router.refresh();
    } catch (error) {
      setSelectedCategories((current) => ({ ...current, [document.id]: document.categoryId || "" }));
      setStatuses((current) => ({ ...current, [document.id]: error instanceof Error ? error.message : t("saveFailed") }));
    } finally { setBusyKey(null); }
  };

  const saveListing = async (event: FormEvent<HTMLFormElement>, document: DocumentRecord) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const key = `document-${document.id}`;
    setBusyKey(key);
    setStatuses((current) => ({ ...current, [document.id]: t("saving") }));
    try {
      const result = await request(`/api/documents/${document.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: data.get("title"),
          description: data.get("description"),
          emailSubject: data.get("emailSubject"),
          isPublic: data.get("isPublic") === "on",
        }),
      });
      const saved = result.document as DocumentRecord;
      setDocuments((current) => current.map((item) => item.id === document.id ? { ...item, title: saved.title, description: saved.description, emailSubject: saved.emailSubject, isPublic: saved.isPublic } : item));
      setStatuses((current) => ({ ...current, [document.id]: t("saved") }));
      router.refresh();
    } catch (error) {
      setStatuses((current) => ({ ...current, [document.id]: error instanceof Error ? error.message : t("saveFailed") }));
    } finally { setBusyKey(null); }
  };

  const deleteDocument = async (document: DocumentRecord) => {
    const confirmation = deleteConfirmations[document.id] || "";
    setBusyKey(`document-${document.id}`);
    setStatuses((current) => ({ ...current, [document.id]: "" }));
    try {
      await request(`/api/documents/${document.id}`, { method: "DELETE", body: JSON.stringify({ confirmation }) });
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      router.refresh();
    } catch (error) {
      setStatuses((current) => ({ ...current, [document.id]: error instanceof Error ? error.message : t("saveFailed") }));
    } finally { setBusyKey(null); }
  };

  return <div className="document-management-workspace" data-edit-ignore="true">
    <section className="tile document-management-panel">
      <header className="document-panel-header"><div><h2>{t("manageCategories")}</h2><p className="muted">{t("categoriesHelp")}</p></div></header>
      <form className="document-category-create" onSubmit={addCategory}>
        <label><span>{t("newCategoryName")}</span><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} required maxLength={100} /></label>
        <button className="btn btn-basic" type="submit" disabled={busyKey === "category-new"}>{t("createCategory")}</button>
      </form>
      <div className="document-category-grid">
        {categories.map((category) => <div className="document-category-row" key={category.id}>
          <input aria-label={t("categoryName")} value={categoryNames[category.id] ?? category.name} onChange={(event) => setCategoryNames((current) => ({ ...current, [category.id]: event.target.value }))} />
          <button className="btn btn-muted" type="button" disabled={busyKey === `category-${category.id}`} onClick={() => renameCategory(category.id)}>{t("renameCategory")}</button>
          <button className="btn btn-warning" type="button" disabled={busyKey === `category-${category.id}`} onClick={() => removeCategory(category)}>{t("deleteCategory")}</button>
        </div>)}
        {!categories.length ? <p className="muted">{t("noCategories")}</p> : null}
      </div>
      {statuses.categories ? <p className="document-save-status" role="status">{statuses.categories}</p> : null}
    </section>

    {uploadForm ? <section className="document-upload-section">
      <header className="document-panel-header"><div><h2>{t("uploadHeading")}</h2><p className="muted">{t("uploadCategoryPrompt")}</p></div></header>
      {uploadForm}
    </section> : null}

    <section className="document-list-section">
      <header className="document-panel-header"><div><h2>{t("uploadedHeading")}</h2><p className="muted">{t("documentManagementHelp")}</p></div></header>
      <div className="document-admin-grid">
        {documents.map((document) => <article key={document.id} className="tile document-management-card">
          <header className="document-card-header">
            <div><h3>{document.title}</h3><p>{document.description || t("noDescription")}</p></div>
            <span className={`status-label ${document.isPublic ? "available" : "unavailable"}`}>{document.isPublic ? t("public") : t("private")}</span>
          </header>

          <div className="document-category-assignment">
            <label><span>{t("category")}</span><select value={selectedCategories[document.id] ?? ""} onChange={(event) => setSelectedCategories((current) => ({ ...current, [document.id]: event.target.value }))}>
              <option value="">{t("uncategorized")}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select></label>
            <button type="button" className="btn btn-basic" disabled={busyKey === `document-${document.id}` || (selectedCategories[document.id] ?? "") === (document.categoryId || "")} onClick={() => saveCategoryAssignment(document)}>{t("saveCategory")}</button>
          </div>
          {statuses[document.id] ? <p className="document-save-status" role="status">{statuses[document.id]}</p> : null}

          <div className="document-primary-actions">
            <Link className="btn btn-basic" href={`/documents/${document.id}`}>{t("view")}</Link>
            <a className="btn btn-muted" href={`/api/documents/${document.id}/download`}>{t("download")}</a>
          </div>

          <details className="document-admin-disclosure"><summary>{t("editListing")}</summary>
            <form className="document-settings-form" onSubmit={(event) => saveListing(event, document)}>
              <label><span>{t("titleField")}</span><input name="title" defaultValue={document.title} required /></label>
              <label><span>{t("description")}</span><textarea name="description" defaultValue={document.description} rows={3} /></label>
              <label><span>{t("emailRecord")}</span><input name="emailSubject" defaultValue={document.emailSubject} /></label>
              <label className="document-checkbox"><input name="isPublic" type="checkbox" defaultChecked={document.isPublic} /><span>{t("publicDatabase")}</span></label>
              <button className="btn btn-basic" type="submit" disabled={busyKey === `document-${document.id}`}>{t("saveListing")}</button>
            </form>
          </details>

          <details className="document-admin-disclosure"><summary>{t("replaceFile")}</summary><div className="document-disclosure-body">
            <ReplaceDocumentFileForm documentId={document.id} labels={{ file: t("replacementFile"), replace: t("replaceButton"), replacing: t("replacing"), success: t("replaceSuccess"), chooseFile: t("chooseReplacement"), failed: t("replaceFailed") }} />
          </div></details>

          <details className="document-admin-disclosure"><summary>{t("recipients", { count: document.recipients.length })}</summary><div className="document-disclosure-body">
            {document.recipients.length ? <ul>{document.recipients.map((user) => <li key={user.email}>{user.name || user.email}{user.name ? ` (${user.email})` : ""}</li>)}</ul> : <p className="muted">{t("noRecipients")}</p>}
          </div></details>

          <details className="document-admin-disclosure danger"><summary>{t("deleteDocument")}</summary><div className="document-delete-controls">
            <p className="muted">{t("deleteDocumentHelp")}</p>
            <input value={deleteConfirmations[document.id] || ""} onChange={(event) => setDeleteConfirmations((current) => ({ ...current, [document.id]: event.target.value }))} placeholder={t("typeDelete")} aria-label={t("typeDelete")} />
            <button className="btn btn-warning" type="button" disabled={busyKey === `document-${document.id}` || deleteConfirmations[document.id] !== "DELETE"} onClick={() => deleteDocument(document)}>{t("deleteDrive")}</button>
          </div></details>
        </article>)}
        {!documents.length ? <p className="muted">{t("noDocuments")}</p> : null}
      </div>
    </section>
  </div>;
}
