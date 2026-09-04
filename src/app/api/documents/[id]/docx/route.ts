import { NextResponse } from "next/server";
import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";
import { getCurrentUser, escapeHtml } from "@/lib/document-access";
import { documentViewerKind, findAccessibleDocument } from "@/lib/document-delivery";
import { downloadDriveDocument } from "@/lib/google";

export const runtime = "nodejs";
export const maxDuration = 60;

type Props = { params: Promise<{ id: string }> };

const MAX_DOCX_BYTES = 20 * 1024 * 1024;

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  const document = await findAccessibleDocument(id, user);
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  if (documentViewerKind(document.mimeType, document.fileName) !== "docx") {
    return NextResponse.json({ error: "This document is not a DOCX file." }, { status: 415 });
  }
  if (document.sizeBytes > MAX_DOCX_BYTES) {
    return NextResponse.json(
      { error: "This DOCX file is too large for the web viewer. Download the original instead." },
      { status: 413 }
    );
  }

  try {
    const driveResponse = await downloadDriveDocument(document.driveFileId);
    if (!driveResponse.ok) throw new Error("Google Drive returned an unavailable file.");

    const bytes = await driveResponse.arrayBuffer();
    if (bytes.byteLength > MAX_DOCX_BYTES) {
      return NextResponse.json(
        { error: "This DOCX file is too large for the web viewer. Download the original instead." },
        { status: 413 }
      );
    }

    const converted = await mammoth.convertToHtml(
      { buffer: Buffer.from(bytes) },
      {
        externalFileAccess: false,
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => p.docx-subtitle:fresh",
        ],
      }
    );
    const safeBody = sanitizeHtml(converted.value, {
      allowedTags: [
        "a", "blockquote", "br", "caption", "code", "col", "colgroup", "dd", "dl", "dt",
        "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "img", "li", "ol", "p", "pre",
        "s", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul",
      ],
      allowedAttributes: {
        a: ["href", "title", "target", "rel"],
        img: ["src", "alt", "title", "width", "height"],
        td: ["colspan", "rowspan"],
        th: ["colspan", "rowspan", "scope"],
        p: ["class"],
      },
      allowedClasses: { p: ["docx-subtitle"] },
      allowedSchemes: ["http", "https", "mailto"],
      allowedSchemesByTag: { img: ["data"] },
      allowProtocolRelative: false,
      transformTags: {
        a: (_tagName, attributes) => ({
          tagName: "a",
          attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer" },
        }),
      },
    });

    const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(document.title)}</title>
  <style>
    :root { color-scheme: light; }
    body { max-width: 850px; margin: 0 auto; padding: 40px 48px 72px; color: #111827; background: #fff; font: 16px/1.65 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.4em 0 .55em; }
    p { margin: .75em 0; }
    .docx-subtitle { color: #4b5563; font-size: 1.1em; }
    img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; margin: 1.25em 0; }
    th, td { border: 1px solid #d1d5db; padding: .45rem .6rem; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
    blockquote { margin-left: 0; padding-left: 1rem; border-left: 3px solid #d1d5db; color: #4b5563; }
    pre { overflow-x: auto; padding: 1rem; background: #f3f4f6; }
    a { color: #1d4ed8; }
    @media (max-width: 640px) { body { padding: 24px 20px 48px; } }
  </style>
</head>
<body>${safeBody}</body>
</html>`;

    return new NextResponse(page, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DOCX conversion failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
