export const runtime = "nodejs";

import Link from "next/link";
import DocumentDatabaseBrowser from "./DocumentDatabaseBrowser";
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
      include: { category: true, createdBy: { select: { name: true, email: true } }, recipients: { include: { user: { select: { name: true, email: true } } } } },
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

      {documents.length === 0 ? <p className="muted">{t("empty")}</p> : <DocumentDatabaseBrowser
        isAdmin={isAdmin}
        groups={documentGroups.map((group) => ({
          id: group.id,
          name: group.name,
          documents: group.documents.map((document) => ({
            id: document.id,
            title: document.title,
            description: document.description,
            uploaderName: document.createdBy?.name?.trim() || document.createdBy?.email || t("unknownUploader"),
            createdAt: document.createdAt.toISOString(),
            recipients: document.recipients.map(({ user: recipient }) => ({ name: recipient.name, email: recipient.email })),
          })),
        }))}
        labels={{
          allCategories: t("allCategories"), category: t("category"), searchDocuments: t("searchDocuments"), searchPlaceholder: t("searchPlaceholder"),
          sortBy: t("sortBy"), uploadDate: t("uploadDate"), documentTitle: t("documentTitle"), sortOrder: t("sortOrder"), descending: t("descending"), ascending: t("ascending"),
          noMatchingDocuments: t("noMatchingDocuments"), view: t("view"), download: t("download"), deleteEntry: t("deleteEntry"), deleting: t("deleting"),
          deleteConfirm: t("deleteConfirm", { title: "{title}" }), visibleTo: t("visibleTo", { count: "{count}" }),
          uploadedBy: t("uploadedBy"),
        }}
      />}
    </main>
  );
}
