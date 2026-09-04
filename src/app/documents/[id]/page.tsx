export const runtime = "nodejs";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/document-access";
import { documentViewerKind, findAccessibleDocument } from "@/lib/document-delivery";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ id: string }> };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentViewerPage({ params }: Props) {
  const { id } = await params;
  const [t, td] = await Promise.all([getTranslations("sitePages.viewer"), getTranslations("sitePages.database")]);
  const user = await getCurrentUser();
  const document = await findAccessibleDocument(id, user);
  if (!document) notFound();

  const kind = documentViewerKind(document.mimeType, document.fileName);
  const contentUrl = kind === "docx"
    ? `/api/documents/${document.id}/docx`
    : `/api/documents/${document.id}/content`;
  const downloadUrl = `/api/documents/${document.id}/download`;

  return (
    <main style={{ display: "grid", gap: "1.25rem" }}>
      <header className="tile" style={{ display: "grid", gap: "0.75rem" }}>
        <div>
          <Link href="/database">{t("back")}</Link>
        </div>
        <div>
          <h1 style={{ margin: 0 }}>{document.title}</h1>
          <p style={{ whiteSpace: "pre-wrap" }}>{document.description}</p>
          <p className="muted" style={{ marginBottom: 0 }}>
            {document.fileName} · {formatBytes(document.sizeBytes)} · {document.isPublic ? td("public") : td("private")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {kind !== "unsupported" ? (
            <a className="btn btn-muted" href={contentUrl} target="_blank" rel="noreferrer">
              {t("openNewTab")}
            </a>
          ) : null}
          <a className="btn btn-basic" href={downloadUrl}>{t("downloadOriginal")}</a>
        </div>
      </header>

      <section
        className="tile"
        data-edit-ignore="true"
        aria-label={`Viewer for ${document.title}`}
        style={{ minHeight: "65vh", padding: "1rem" }}
      >
        {kind === "pdf" || kind === "docx" || kind === "text" ? (
          <iframe
            src={contentUrl}
            title={document.title}
            sandbox={kind === "docx" ? "allow-popups allow-popups-to-escape-sandbox" : undefined}
            style={{ width: "100%", height: "72vh", border: 0, background: "#fff" }}
          />
        ) : null}

        {kind === "image" ? (
          // The source is an authorized same-origin streaming endpoint, not a static image asset.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contentUrl}
            alt={document.title}
            style={{ display: "block", maxWidth: "100%", maxHeight: "75vh", margin: "0 auto" }}
          />
        ) : null}

        {kind === "audio" ? (
          <audio controls preload="metadata" src={contentUrl} style={{ width: "100%" }}>
            {t("audioUnsupported")}
          </audio>
        ) : null}

        {kind === "video" ? (
          <video controls preload="metadata" src={contentUrl} style={{ width: "100%", maxHeight: "75vh" }}>
            {t("videoUnsupported")}
          </video>
        ) : null}

        {kind === "unsupported" ? (
          <div style={{ maxWidth: 640, margin: "4rem auto", textAlign: "center" }}>
            <h2>{t("previewUnavailable")}</h2>
            <p className="muted">{t("unsupported")}</p>
            <a className="btn btn-basic" href={downloadUrl}>{t("downloadOriginal")}</a>
          </div>
        ) : null}
      </section>
    </main>
  );
}
