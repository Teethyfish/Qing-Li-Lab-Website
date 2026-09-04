export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import DocumentManager from "./DocumentManager";
import DocumentUploadForm from "./DocumentUploadForm";

type Props = { searchParams: Promise<{ google?: string }> };

export default async function AdminDocumentsPage({ searchParams }: Props) {
  await requireAdminUser().catch(() => redirect("/"));
  const t = await getTranslations("sitePages.documentsAdmin");
  const params = await searchParams;
  const googleOAuthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && (process.env.GOOGLE_REDIRECT_URI || process.env.NEXT_PUBLIC_SITE_URL));
  const [connection, users, categories, documents] = await Promise.all([
    prisma.googleConnection.findUnique({ where: { id: "google" } }),
    prisma.user.findMany({
      orderBy: [{ membershipStatus: "asc" }, { name: "asc" }, { email: "asc" }],
      select: { id: true, email: true, name: true, membershipStatus: true },
    }),
    prisma.documentCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.labDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true, recipients: { include: { user: { select: { name: true, email: true } } } } },
    }),
  ]);

  return <main className="document-admin-page">
    <header className="document-admin-title">
      <h1>{t("title")}</h1>
      <p className="muted">{t("subtitle")}</p>
    </header>

    <section className="tile document-connection-panel" data-edit-ignore="true">
      <h2>{t("googleConnection")}</h2>
      {connection ? <p>{t("connectedAs")} <strong>{connection.email}</strong>. {t("connectedDetail")}</p>
        : googleOAuthConfigured ? <div><p className="muted">{t("connectPrompt")}</p><a className="btn btn-basic" href="/api/google/connect">{t("connectButton")}</a></div>
        : <p className="muted">{t("configMissing")}</p>}
      {params.google && params.google !== "connected" ? <p role="alert" className="document-error">{t("connectionFailed", { reason: params.google })}</p> : null}
    </section>

    <DocumentManager
      initialCategories={categories}
      initialDocuments={documents.map((document) => ({
        id: document.id,
        title: document.title,
        description: document.description,
        emailSubject: document.emailSubject,
        isPublic: document.isPublic,
        categoryId: document.categoryId,
        category: document.category ? { id: document.category.id, name: document.category.name } : null,
        recipients: document.recipients.map(({ user }) => ({ name: user.name, email: user.email })),
      }))}
      uploadForm={connection ? <DocumentUploadForm users={users} categories={categories} /> : undefined}
    />
  </main>;
}
