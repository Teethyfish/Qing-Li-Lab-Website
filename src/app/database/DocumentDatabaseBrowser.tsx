"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AdminDeleteDocumentButton from "./AdminDeleteDocumentButton";

type DocumentRecord = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  recipients: Array<{ name: string | null; email: string }>;
};

type DocumentGroup = {
  id: string;
  name: string;
  documents: DocumentRecord[];
};

type Labels = {
  allCategories: string;
  category: string;
  searchDocuments: string;
  searchPlaceholder: string;
  sortBy: string;
  uploadDate: string;
  documentTitle: string;
  sortOrder: string;
  descending: string;
  ascending: string;
  noMatchingDocuments: string;
  view: string;
  download: string;
  deleteEntry: string;
  deleting: string;
  deleteConfirm: string;
  visibleTo: string;
};

export default function DocumentDatabaseBrowser({ groups, isAdmin, labels }: { groups: DocumentGroup[]; isAdmin: boolean; labels: Labels }) {
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const visibleGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return groups
      .filter((group) => categoryId === "all" || group.id === categoryId)
      .map((group) => ({
        ...group,
        documents: group.documents
          .filter((document) => !normalizedSearch || document.title.toLocaleLowerCase().includes(normalizedSearch))
          .sort((left, right) => {
            const comparison = sortBy === "title"
              ? left.title.localeCompare(right.title, undefined, { sensitivity: "base" })
              : new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
            return order === "asc" ? comparison : -comparison;
          }),
      }))
      .filter((group) => group.documents.length);
  }, [categoryId, groups, order, search, sortBy]);

  const hasMatchingDocuments = visibleGroups.some((group) => group.documents.length);

  return <>
    <div className="document-filter-controls document-database-filters" data-edit-ignore="true">
      <label><span>{labels.category}</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="all">{labels.allCategories}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.documents.length})</option>)}</select></label>
      <label className="document-filter-search"><span>{labels.searchDocuments}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.searchPlaceholder} /></label>
      <label><span>{labels.sortBy}</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as "date" | "title")}><option value="date">{labels.uploadDate}</option><option value="title">{labels.documentTitle}</option></select></label>
      <label><span>{labels.sortOrder}</span><select value={order} onChange={(event) => setOrder(event.target.value as "asc" | "desc")}><option value="desc">{labels.descending}</option><option value="asc">{labels.ascending}</option></select></label>
    </div>

    <section className="document-database-results">
      {!hasMatchingDocuments ? <p className="muted">{labels.noMatchingDocuments}</p> : null}
      {visibleGroups.map((group) => <section key={group.id} className="document-category-section">
        <h2>{group.name}</h2>
        <div className="document-category-list">
          {group.documents.map((document) => <article id={`document-${document.id}`} key={document.id} className="tile document-listing" style={{ scrollMarginTop: 90 }}>
            <div className="document-database-row">
              <div className="document-database-copy">
                <p className="document-listing-title"><strong>{document.title}</strong></p>
                <p style={{ whiteSpace: "pre-wrap" }}>{document.description}</p>
              </div>
              <div className="document-database-actions">
                <Link className="btn btn-basic" href={`/documents/${document.id}`}>{labels.view}</Link>
                <a className="btn btn-muted" href={`/api/documents/${document.id}/download`}>{labels.download}</a>
                {isAdmin ? <AdminDeleteDocumentButton
                  documentId={document.id}
                  documentTitle={document.title}
                  label={labels.deleteEntry}
                  deletingLabel={labels.deleting}
                  confirmMessage={labels.deleteConfirm}
                /> : null}
              </div>
            </div>
            {isAdmin && document.recipients.length ? <details style={{ marginTop: "1rem" }}>
              <summary>{labels.visibleTo.replace("{count}", String(document.recipients.length))}</summary>
              <ul>{document.recipients.map((recipient) => <li key={recipient.email}>{recipient.name || recipient.email} ({recipient.email})</li>)}</ul>
            </details> : null}
          </article>)}
        </div>
      </section>)}
    </section>
  </>;
}
