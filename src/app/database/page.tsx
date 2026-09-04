export const runtime = "nodejs";

import Link from "next/link";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentDatabasePage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";
  const documents = await prisma.labDocument.findMany({
    where: isAdmin
      ? undefined
      : user
        ? { OR: [{ isPublic: true }, { recipients: { some: { userId: user.id } } }] }
        : { isPublic: true },
    orderBy: { createdAt: "desc" },
    include: { recipients: { include: { user: { select: { name: true, email: true } } } } },
  });

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1>Lab document database</h1>
        <p className="muted">
          Public resources are available to everyone. Signed-in members also see documents sent directly to them.
        </p>
      </header>

      {!user ? (
        <p className="tile">
          You are viewing the public collection. <Link href="/login">Sign in</Link> to see documents shared with your account.
        </p>
      ) : null}

      <section style={{ display: "grid", gap: "1rem" }}>
        {documents.length === 0 ? <p className="muted">No documents are available to you yet.</p> : null}
        {documents.map((document) => {
          const recipients = document.recipients;
          return (
            <article id={`document-${document.id}`} key={document.id} className="tile" style={{ scrollMarginTop: 90 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0 }}>{document.title}</h2>
                  <p style={{ whiteSpace: "pre-wrap" }}>{document.description}</p>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {document.fileName} · {formatBytes(document.sizeBytes)} · {document.isPublic ? "Public" : "Private"} · {document.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <a className="btn btn-basic" href={`/api/documents/${document.id}/download`}>Download</a>
                </div>
              </div>
              {isAdmin && recipients.length ? (
                <details style={{ marginTop: "1rem" }}>
                  <summary>Visible to {recipients.length} recipient(s)</summary>
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
      </section>
    </main>
  );
}
