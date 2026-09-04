export const runtime = "nodejs";

import Link from "next/link";
import AdminDeleteDocumentButton from "./AdminDeleteDocumentButton";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function DocumentDatabasePage() {
  const user = await getCurrentUser();
  const t = await getTranslations("sitePages.database");
  const isAdmin = user?.role === "ADMIN" && user.isActive;
  const [categories, documents] = await Promise.all([
    prisma.documentCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.labDocument.findMany({
      where: isAdmin
        ? undefined
        : user
          ? { OR: [{ isPublic: true }, { recipients: { some: { userId: user.id } } }] }
          : { isPublic: true },
      orderBy: { createdAt: "desc" },
      include: { category: true, recipients: { include: { user: { select: { name: true, email: true } } } } },
    }),
  ]);
  const documentGroups = [
    ...categories.map((category) => ({ id: category.id, name: category.name, documents: documents.filter((document) => document.categoryId === category.id) })),
    { id: "uncategorized", name: t("uncategorized"), documents: documents.filter((document) => !document.categoryId) },
  ].filter((group) => group.documents.length);

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1>{t("title")}</h1>
        <p className="muted">{t("subtitle")}</p>
      </header>

      {isAdmin ? <div><Link className="btn btn-muted" href="/members/documents">{t("manageDatabase")}</Link></div> : null}

      {!user ? (
        <p className="tile">
          {t("publicNoticeBefore")} <Link href="/login">{t("signIn")}</Link> {t("publicNoticeAfter")}
        </p>
      ) : null}

      <section style={{ display: "grid", gap: "1.5rem" }}>
        {documents.length === 0 ? <p className="muted">{t("empty")}</p> : null}
        {documentGroups.map((group) => <section key={group.id} className="document-category-section">
          <h2>{group.name}</h2>
          <div className="document-category-list">
          {group.documents.map((document) => {
          const recipients = document.recipients;
          return (
            <article id={`document-${document.id}`} key={document.id} className="tile document-listing" style={{ scrollMarginTop: 90 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                  <p className="document-listing-title"><strong>{document.title}</strong></p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{document.description}</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: "0 0 auto", alignSelf: "flex-start" }}>
                  <Link className="btn btn-basic" href={`/documents/${document.id}`}>{t("view")}</Link>
                  <a className="btn btn-muted" href={`/api/documents/${document.id}/download`}>{t("download")}</a>
                  {isAdmin ? (
                    <AdminDeleteDocumentButton
                      documentId={document.id}
                      documentTitle={document.title}
                      label={t("deleteEntry")}
                      deletingLabel={t("deleting")}
                      confirmMessage={t("deleteConfirm", { title: "{title}" })}
                    />
                  ) : null}
                </div>
              </div>
              {isAdmin && recipients.length ? (
                <details style={{ marginTop: "1rem" }}>
                  <summary>{t("visibleTo", { count: recipients.length })}</summary>
                  <ul>
                    {recipients.map(({ user: recipient }) => (
                      <li key={recipient.email}>{recipient.name || recipient.email} ({recipient.email})</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </article>
          );
          })}
          </div>
        </section>)}
      </section>
    </main>
  );
}
