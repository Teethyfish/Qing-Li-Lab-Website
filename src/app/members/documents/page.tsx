export const runtime = "nodejs";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DocumentUploadForm from "./DocumentUploadForm";
import { deleteDocumentEntry } from "@/app/database/actions";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import ReplaceDocumentFileForm from "./ReplaceDocumentFileForm";

type Props = { searchParams: Promise<{ google?: string }> };

function categorySlug(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "category";
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

  async function createCategory(formData: FormData) {
    "use server";
    await requireAdminUser();
    const name = String(formData.get("name") || "").trim().slice(0, 100);
    if (!name || await prisma.documentCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" } } })) return;
    await prisma.documentCategory.create({ data: { name, slug: `${categorySlug(name)}-${crypto.randomUUID().slice(0, 8)}` } });
    revalidatePath("/members/documents");
    revalidatePath("/database");
  }

  async function updateCategory(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("id") || "");
    const name = String(formData.get("name") || "").trim().slice(0, 100);
    if (!id || !name) return;
    const duplicate = await prisma.documentCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" }, NOT: { id } } });
    if (duplicate) return;
    await prisma.documentCategory.updateMany({ where: { id }, data: { name } });
    revalidatePath("/members/documents");
    revalidatePath("/database");
  }

  async function deleteCategory(formData: FormData) {
    "use server";
    await requireAdminUser();
    const id = String(formData.get("id") || "");
    if (!id) return;
    await prisma.documentCategory.deleteMany({ where: { id } });
    revalidatePath("/members/documents");
    revalidatePath("/database");
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
        categoryId: String(formData.get("categoryId") || "") || null,
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
          <DocumentUploadForm users={users} categories={categories} />
        </section>
      ) : null}

      <section className="tile">
        <h2 style={{ marginTop: 0 }}>{t("manageCategories")}</h2>
        <p className="muted">{t("categoriesHelp")}</p>
        <form action={createCategory} style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <input name="name" required maxLength={100} placeholder={t("newCategoryName")} />
          <button className="btn btn-basic" type="submit">{t("createCategory")}</button>
        </form>
        <div style={{ display: "grid", gap: ".6rem" }}>
          {categories.map((category) => <div key={category.id} style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
            <form action={updateCategory} style={{ display: "flex", gap: ".6rem", alignItems: "center", flex: "1 1 320px" }}>
              <input type="hidden" name="id" value={category.id} />
              <input name="name" defaultValue={category.name} required maxLength={100} style={{ flex: 1 }} />
              <button className="btn btn-muted" type="submit">{t("renameCategory")}</button>
            </form>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={category.id} />
              <button className="btn btn-warning" type="submit">{t("deleteCategory")}</button>
            </form>
          </div>)}
          {!categories.length ? <p className="muted">{t("noCategories")}</p> : null}
        </div>
      </section>

      <section>
        <h2>{t("uploadedHeading")}</h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          {documents.length === 0 ? <p className="muted">{t("noDocuments")}</p> : null}
          {documents.map((document) => (
            <article key={document.id} className="tile document-admin-listing">
              <p style={{ margin: 0 }}><strong>{document.title}</strong></p>
              <p>{document.description}</p>
              <p className="muted">{document.category?.name || t("uncategorized")} · {document.isPublic ? t("public") : t("private")}</p>
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
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>{t("category")}</span>
                    <select name="categoryId" defaultValue={document.categoryId || ""}>
                      <option value="">{t("uncategorized")}</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                  <div><button className="btn btn-basic" type="submit">{t("saveListing")}</button></div>
                </form>
              </details>
              <details style={{ marginTop: ".75rem" }}>
                <summary>{t("replaceFile")}</summary>
                <div style={{ marginTop: ".75rem" }}>
                  <ReplaceDocumentFileForm documentId={document.id} labels={{
                    file: t("replacementFile"),
                    replace: t("replaceButton"),
                    replacing: t("replacing"),
                    success: t("replaceSuccess"),
                    chooseFile: t("chooseReplacement"),
                    failed: t("replaceFailed"),
                  }} />
                </div>
              </details>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
                <a className="btn btn-basic" href={`/documents/${document.id}`}>{t("view")}</a>
                <a className="btn btn-muted" href={`/api/documents/${document.id}/download`}>{t("download")}</a>
                <form action={deleteDocumentEntry} style={{ display: "flex", gap: 6 }}>
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
