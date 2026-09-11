import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import PublicationList from "@/components/PublicationList";
import {
  getPublicationAuthor,
  getPublications,
  GOOGLE_SCHOLAR_PROFILE_URL,
  OPENALEX_PROFILE_URL,
} from "@/lib/publications";

const PAGE_SIZE = 20;

function positiveInteger(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function PublicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("sitePages.publications");
  const locale = await getLocale();
  const page = positiveInteger((await searchParams).page);
  const [result, author] = await Promise.all([
    getPublications({ page, perPage: PAGE_SIZE }),
    getPublicationAuthor(),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const profile = author || {
    name: "Qing X. Li",
    institution: "University of Hawaiʻi at Mānoa",
    worksCount: result.total,
    citedByCount: 0,
    hIndex: null,
    i10Index: null,
    orcidUrl: "https://orcid.org/0000-0003-4589-2869",
  };
  const listLabels = {
    journalUnavailable: t("journalUnavailable"),
    openPaper: t("openPaper"),
    openAccess: t("openAccess"),
    citedBy: t("citedBy", { count: "{count}" }),
  };

  return <main className="publications-page">
    <header className="publications-heading">
      <p className="research-project-kicker">{t("kicker")}</p>
      <h1>{t("title", { name: profile.name })}</h1>
    </header>

    <div className="publications-layout">
      <aside className="tile publication-profile">
        <div className="publication-profile-monogram" aria-hidden="true">QL</div>
        <h2>{profile.name}</h2>
        <p>{profile.institution}</p>
        <dl className="publication-stats">
          <div><dt>{t("works")}</dt><dd>{profile.worksCount.toLocaleString(locale)}</dd></div>
          <div><dt>{t("citations")}</dt><dd>{profile.citedByCount.toLocaleString(locale)}</dd></div>
          {profile.hIndex !== null ? <div><dt>{t("hIndex")}</dt><dd>{profile.hIndex}</dd></div> : null}
          {profile.i10Index !== null ? <div><dt>{t("i10Index")}</dt><dd>{profile.i10Index}</dd></div> : null}
        </dl>
        <div className="publication-profile-links">
          {profile.orcidUrl ? <a href={profile.orcidUrl} target="_blank" rel="noreferrer">ORCID</a> : null}
          <a href={GOOGLE_SCHOLAR_PROFILE_URL} target="_blank" rel="noreferrer">Google Scholar</a>
          <a href={OPENALEX_PROFILE_URL} target="_blank" rel="noreferrer">OpenAlex</a>
        </div>
      </aside>

      <section className="publication-results" aria-labelledby="publication-results-title">
        <div className="publication-results-heading">
          <div>
            <h2 id="publication-results-title">{t("publicationList")}</h2>
            {result.available ? <p className="muted">{t("resultCount", { count: result.total })}</p> : null}
          </div>
          <p className="publication-page-count">{t("pageCount", { page, total: totalPages })}</p>
        </div>

        {!result.available ? <p className="tile publication-message">{t("unavailable")}</p> : null}
        {result.available && !result.publications.length ? <p className="tile publication-message">{t("empty")}</p> : null}
        <PublicationList publications={result.publications} locale={locale} labels={listLabels} />

        {result.available && totalPages > 1 ? <nav className="publication-pagination" aria-label={t("paginationLabel")}>
          {page > 1 ? <Link className="btn btn-muted" href={page === 2 ? "/publications" : `/publications?page=${page - 1}`}>{t("previous")}</Link> : <span />}
          {page < totalPages ? <Link className="btn btn-basic" href={`/publications?page=${page + 1}`}>{t("next")}</Link> : null}
        </nav> : null}
      </section>
    </div>

    <p className="publication-source-note muted">{t("sourceNote")}</p>
  </main>;
}
