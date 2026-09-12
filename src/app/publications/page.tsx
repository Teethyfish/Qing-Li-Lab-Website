import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import PublicationList from "@/components/PublicationList";
import {
  getPublicationAuthor,
  getPublicationIndex,
  GOOGLE_SCHOLAR_PROFILE_URL,
  OPENALEX_PROFILE_URL,
  type Publication,
} from "@/lib/publications";

const PAGE_SIZE = 20;
type PublicationSort = "citations" | "journal" | "title" | "date";
type SortOrder = "asc" | "desc";

function positiveInteger(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function firstParameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sortedPublications(publications: Publication[], sort: PublicationSort, order: SortOrder, locale: string) {
  const direction = order === "asc" ? 1 : -1;
  return [...publications].sort((left, right) => {
    const leftValue = sort === "citations" ? left.citedByCount : sort === "journal" ? left.journal : sort === "title" ? left.title : left.publicationDate;
    const rightValue = sort === "citations" ? right.citedByCount : sort === "journal" ? right.journal : sort === "title" ? right.title : right.publicationDate;
    if (leftValue === null || leftValue === "") return rightValue === null || rightValue === "" ? 0 : 1;
    if (rightValue === null || rightValue === "") return -1;
    const comparison = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), locale, { sensitivity: "base" });
    if (comparison !== 0) return comparison * direction;
    return left.title.localeCompare(right.title, locale, { sensitivity: "base" });
  });
}

function pageHref(page: number, sort: PublicationSort, order: SortOrder) {
  const parameters = new URLSearchParams({ sort, order });
  if (page > 1) parameters.set("page", String(page));
  return `/publications?${parameters.toString()}`;
}

export default async function PublicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("sitePages.publications");
  const locale = await getLocale();
  const parameters = await searchParams;
  const page = positiveInteger(parameters.page);
  const requestedSort = firstParameter(parameters.sort);
  const requestedOrder = firstParameter(parameters.order);
  const sort: PublicationSort = requestedSort === "journal" || requestedSort === "title" || requestedSort === "date" ? requestedSort : "citations";
  const order: SortOrder = requestedOrder === "asc" ? "asc" : "desc";
  const [result, author] = await Promise.all([
    getPublicationIndex(),
    getPublicationAuthor(),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const publications = sortedPublications(result.publications, sort, order, locale)
    .slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
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
        <Image
          className="publication-profile-monogram"
          src="/Qingl.png"
          alt={profile.name}
          width={74}
          height={74}
          priority
        />
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
          <p className="publication-page-count">{t("pageCount", { page: safePage, total: totalPages })}</p>
        </div>

        <form className="publication-sort-controls" method="get">
          <label><span>{t("sortBy")}</span><select name="sort" defaultValue={sort}>
            <option value="citations">{t("sortCitations")}</option>
            <option value="journal">{t("sortJournal")}</option>
            <option value="title">{t("sortTitle")}</option>
            <option value="date">{t("sortDate")}</option>
          </select></label>
          <label><span>{t("sortOrder")}</span><select name="order" defaultValue={order}>
            <option value="desc">{t("descending")}</option>
            <option value="asc">{t("ascending")}</option>
          </select></label>
          <button className="btn btn-muted" type="submit">{t("applySort")}</button>
        </form>

        {!result.available ? <p className="tile publication-message">{t("unavailable")}</p> : null}
        {result.available && !publications.length ? <p className="tile publication-message">{t("empty")}</p> : null}
        <PublicationList publications={publications} locale={locale} labels={listLabels} />

        {result.available && totalPages > 1 ? <nav className="publication-pagination" aria-label={t("paginationLabel")}>
          {safePage > 1 ? <Link className="btn btn-muted" href={pageHref(safePage - 1, sort, order)}>{t("previous")}</Link> : <span />}
          {safePage < totalPages ? <Link className="btn btn-basic" href={pageHref(safePage + 1, sort, order)}>{t("next")}</Link> : null}
        </nav> : null}
      </section>
    </div>

    <p className="publication-source-note muted">{t("sourceNote")}</p>
  </main>;
}
