import type { Publication } from "@/lib/publications";

type Labels = {
  journalUnavailable: string;
  openPaper: string;
  openAccess: string;
  citedBy: string;
};

function formatPublicationDate(value: string | null, locale: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "zh-Hant" ? "zh-TW" : locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function PublicationList({ publications, locale, labels, compact = false }: { publications: Publication[]; locale: string; labels: Labels; compact?: boolean }) {
  return <div className={compact ? "publication-list publication-list-compact" : "publication-list"}>
    {publications.map((publication) => <article className="publication-entry" key={publication.id}>
      <a className="publication-title" href={publication.href} target="_blank" rel="noreferrer">{publication.title}</a>
      <p className="publication-authors">{publication.authors.join(", ")}</p>
      <div className="publication-meta">
        <span>{publication.journal || labels.journalUnavailable}</span>
        {publication.publicationDate ? <time dateTime={publication.publicationDate}>{formatPublicationDate(publication.publicationDate, locale)}</time> : null}
        {!compact ? <span>{labels.citedBy.replace("{count}", String(publication.citedByCount))}</span> : null}
      </div>
      {!compact ? <div className="publication-actions">
        <a className="btn btn-basic" href={publication.href} target="_blank" rel="noreferrer">{labels.openPaper}</a>
        {publication.openAccessUrl ? <a className="btn btn-muted" href={publication.openAccessUrl} target="_blank" rel="noreferrer">{labels.openAccess}</a> : null}
      </div> : null}
    </article>)}
  </div>;
}
