export const runtime = "nodejs";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DocumentUploadForm from "./DocumentUploadForm";
import { requireAdminUser } from "@/lib/document-access";
import { deleteDriveDocument } from "@/lib/google";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ google?: string }> };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminDocumentsPage({ searchParams }: Props) {
  await requireAdminUser().catch(() => redirect("/"));
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
        <h1>Document distribution</h1>
        <p className="muted">Upload to the lab Google Drive, assign access, and notify recipients.</p>
      </header>

      <section className="tile">
        <h2 style={{ marginTop: 0 }}>Google connection</h2>
        {connection ? (
          <p style={{ marginBottom: 0 }}>
            Connected as <strong>{connection.email}</strong>. Files remain private in this Drive and are downloaded through the website’s access checks.
          </p>
        ) : googleOAuthConfigured ? (
          <div>
            <p className="muted">Connect qinglilab@gmail.com before uploading documents.</p>
            <a className="btn btn-basic" href="/api/google/connect">Connect Google Drive and Gmail</a>
          </div>
        ) : (
          <p className="muted">
            Add the Google OAuth variables from <code>.env.example</code> before connecting the lab account.
          </p>
        )}
        {params.google && params.google !== "connected" ? (
          <p role="alert" style={{ color: "#991b1b" }}>Google connection failed: {params.google}</p>
        ) : null}
      </section>

      {connection ? (
        <section>
          <h2>Upload a document</h2>
          <DocumentUploadForm users={users} />
        </section>
      ) : null}

      <section>
        <h2>Uploaded documents</h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          {documents.length === 0 ? <p className="muted">No documents have been uploaded yet.</p> : null}
          {documents.map((document) => (
            <article key={document.id} className="tile">
              <h3>{document.title}</h3>
              <p>{document.description}</p>
              <p className="muted">
                {document.fileName} · {formatBytes(document.sizeBytes)} · {document.isPublic ? "Public" : "Private"}
              </p>
              <details>
                <summary>Recipients ({document.recipients.length})</summary>
                <ul>
                  {document.recipients.map(({ user }) => (
                    <li key={user.email}>{user.name || user.email} ({user.email})</li>
                  ))}
                </ul>
              </details>
              <details style={{ marginTop: "1rem" }}>
                <summary>Edit document listing</summary>
                <form action={updateDocument} style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
                  <input type="hidden" name="id" value={document.id} />
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Title</span>
                    <input name="title" defaultValue={document.title} required />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Description</span>
                    <textarea name="description" defaultValue={document.description} rows={3} required />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Email title (record only; saving does not resend)</span>
                    <input name="emailSubject" defaultValue={document.emailSubject} required />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input name="isPublic" type="checkbox" defaultChecked={document.isPublic} /> Public
                  </label>
                  <div><button className="btn btn-basic" type="submit">Save listing</button></div>
                </form>
              </details>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
                <a className="btn btn-muted" href={`/api/documents/${document.id}/download`}>Download</a>
                <form action={deleteDocument} style={{ display: "flex", gap: 6 }}>
                  <input type="hidden" name="id" value={document.id} />
                  <input name="confirmation" placeholder="Type DELETE" aria-label="Type DELETE to confirm" />
                  <button className="btn btn-warning" type="submit">Delete from site and Drive</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
