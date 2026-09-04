export const runtime = "nodejs";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DocumentUploadForm from "./DocumentUploadForm";
import { requireAdminUser } from "@/lib/document-access";
import { deleteDriveDocument } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

type Props = { searchParams: Promise<{ google?: string }> };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminDocumentsPage({ searchParams }: Props) {
  await requireAdminUser().catch(() => redirect("/"));
  const t = await getTranslations("sitePages.documentsAdmin");
  const params = await searchParams;
  const googleOAuthConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    (process.env.GOOGLE_REDIRECT_URI || process.env.NEXT_PUBLIC_SITE_URL)
  );
  const [connection, users, documents] = await Promise.all([
    prisma.googleConnection.findUnique({ where: { id: "google" } }),
    prisma.user.findMany({
      orderBy: [{ membershipStatus: "asc" }, { name: "asc" }, { email: "asc" }],
      select: { id: true, email: true, name: true, membershipStatus: true },
    }),
    prisma.labDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { recipients: { include: { user: { select: { name: true, email: true } } } } },
    }),
  ]);

  async function deleteDocument(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("id") || "");
    const confirmation = String(formData.get("confirmation") || "");
    if (!id || confirmation !== "DELETE") return;
    const document = await prisma.labDocument.findUnique({ where: { id } });
    if (!document) return;
    await deleteDriveDocument(document.driveFileId);
    await prisma.labDocument.delete({ where: { id } });
    revalidatePath("/members/documents");
    revalidatePath("/database");
    revalidatePath("/members/notifications");
  }

  async function updateDocument(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("id") || "");
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const emailSubject = String(formData.get("emailSubject") || "").trim();
    if (!id || !title || !description || !emailSubject) return;
    await prisma.labDocument.update({
      where: { id },
      data: {
        title,
        description,
        emailSubject,
        isPublic: formData.get("isPublic") === "on",
      },
    });
    revalidatePath("/members/documents");
    revalidatePath("/database");
  }

  return (
    <main style={{ display: "grid", gap: "2rem" }}>
      <header>
        <h1>{t("title")}</h1>
        <p className="muted">{t("subtitle")}</p>
      </header>

      <section className="tile">
        <h2 style={{ marginTop: 0 }}>{t("googleConnection")}</h2>
        {connection ? (
          <p style={{ marginBottom: 0 }}>
            {t("connectedAs")} <strong>{connection.email}</strong>. {t("connectedDetail")}
          </p>
        ) : googleOAuthConfigured ? (
          <div>
            <p className="muted">{t("connectPrompt")}</p>
            <a className="btn btn-basic" href="/api/google/connect">{t("connectButton")}</a>
          </div>
        ) : (
          <p className="muted">
            {t("configMissing")}
          </p>
        )}
        {params.google && params.google !== "connected" ? (
          <p role="alert" style={{ color: "#991b1b" }}>{t("connectionFailed", { reason: params.google })}</p>
        ) : null}
      </section>

      {connection ? (
        <section>
          <h2>{t("uploadHeading")}</h2>
          <DocumentUploadForm users={users} />
        </section>
      ) : null}

      <section>
        <h2>{t("uploadedHeading")}</h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          {documents.length === 0 ? <p className="muted">{t("noDocuments")}</p> : null}
          {documents.map((document) => (
            <article key={document.id} className="tile">
              <h3>{document.title}</h3>
              <p>{document.description}</p>
              <p className="muted">
                {document.fileName} · {formatBytes(document.sizeBytes)} · {document.isPublic ? t("public") : t("private")}
              </p>
              <details>
                <summary>{t("recipients", { count: document.recipients.length })}</summary>
                <ul>
                  {document.recipients.map(({ user }) => (
                    <li key={user.email}>{user.name || user.email} ({user.email})</li>
                  ))}
                </ul>
              </details>
              <details style={{ marginTop: "1rem" }}>
                <summary>{t("editListing")}</summary>
                <form action={updateDocument} style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
                  <input type="hidden" name="id" value={document.id} />
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>{t("titleField")}</span>
                    <input name="title" defaultValue={document.title} required />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>{t("description")}</span>
                    <textarea name="description" defaultValue={document.description} rows={3} required />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>{t("emailRecord")}</span>
                    <input name="emailSubject" defaultValue={document.emailSubject} required />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input name="isPublic" type="checkbox" defaultChecked={document.isPublic} /> {t("public")}
                  </label>
                  <div><button className="btn btn-basic" type="submit">{t("saveListing")}</button></div>
                </form>
              </details>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
                <a className="btn btn-basic" href={`/documents/${document.id}`}>{t("view")}</a>
                <a className="btn btn-muted" href={`/api/documents/${document.id}/download`}>{t("download")}</a>
                <form action={deleteDocument} style={{ display: "flex", gap: 6 }}>
                  <input type="hidden" name="id" value={document.id} />
                  <input name="confirmation" placeholder={t("typeDelete")} aria-label={t("typeDelete")} />
                  <button className="btn btn-warning" type="submit">{t("deleteDrive")}</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
