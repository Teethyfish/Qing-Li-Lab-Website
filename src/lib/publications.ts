const DEFAULT_AUTHOR_ID = "A5066013551";

export const GOOGLE_SCHOLAR_PROFILE_URL = "https://scholar.google.com/citations?user=6JswiOgAAAAJ";
export const OPENALEX_PROFILE_URL = `https://openalex.org/authors/${DEFAULT_AUTHOR_ID}`;

type OpenAlexLocation = {
  landing_page_url: string | null;
  pdf_url?: string | null;
  source: { display_name: string } | null;
} | null;

type OpenAlexWork = {
  id: string;
  doi: string | null;
  title: string;
  publication_date: string | null;
  authorships: Array<{ author: { display_name: string } }>;
  primary_location: OpenAlexLocation;
  best_oa_location: OpenAlexLocation;
  cited_by_count: number;
};

type OpenAlexWorksResponse = {
  meta: { count: number };
  results: OpenAlexWork[];
};

type OpenAlexAuthorResponse = {
  display_name: string;
  works_count: number;
  cited_by_count: number;
  summary_stats?: { h_index?: number; i10_index?: number };
  ids?: { orcid?: string | null };
  last_known_institutions?: Array<{ display_name: string }>;
};

export type Publication = {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  publicationDate: string | null;
  href: string;
  openAccessUrl: string | null;
  citedByCount: number;
};

export type PublicationPage = {
  publications: Publication[];
  total: number;
  available: boolean;
};

export type PublicationAuthor = {
  name: string;
  institution: string;
  worksCount: number;
  citedByCount: number;
  hIndex: number | null;
  i10Index: number | null;
  orcidUrl: string | null;
};

function apiUrl(path: string, params: Record<string, string>) {
  const url = new URL(`https://api.openalex.org/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const apiKey = process.env.OPENALEX_API_KEY?.trim();
  if (apiKey) url.searchParams.set("api_key", apiKey);
  else url.searchParams.set("mailto", "qingl@hawaii.edu");
  return url;
}

async function openAlexFetch<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Qing-Li-Lab-Website/1.0 (qingl@hawaii.edu)" },
    next: { revalidate: 21_600, tags: ["qing-li-publications"] },
    signal: AbortSignal.timeout(3_000),
  });
  if (!response.ok) throw new Error(`OpenAlex request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

function workId(id: string) {
  return id.split("/").pop() || id;
}

function normalizeWork(work: OpenAlexWork): Publication {
  const primaryUrl = work.primary_location?.landing_page_url;
  const openAccessUrl = work.best_oa_location?.pdf_url || work.best_oa_location?.landing_page_url || null;
  return {
    id: workId(work.id),
    title: work.title,
    authors: work.authorships.map(({ author }) => author.display_name).filter(Boolean),
    journal: work.primary_location?.source?.display_name || work.best_oa_location?.source?.display_name || "",
    publicationDate: work.publication_date,
    href: work.doi || primaryUrl || openAccessUrl || work.id,
    openAccessUrl: openAccessUrl && openAccessUrl !== work.doi && openAccessUrl !== primaryUrl ? openAccessUrl : null,
    citedByCount: work.cited_by_count,
  };
}

export async function getPublications({ page = 1, perPage = 20 }: { page?: number; perPage?: number } = {}): Promise<PublicationPage> {
  const authorId = process.env.OPENALEX_AUTHOR_ID?.trim() || DEFAULT_AUTHOR_ID;
  const safePage = Math.max(1, Math.floor(page));
  const safePerPage = Math.min(100, Math.max(1, Math.floor(perPage)));
  try {
    const result = await openAlexFetch<OpenAlexWorksResponse>(apiUrl("works", {
      filter: `author.id:${authorId}`,
      sort: "publication_date:desc",
      page: String(safePage),
      "per-page": String(safePerPage),
      select: "id,doi,title,publication_date,authorships,primary_location,best_oa_location,cited_by_count",
    }));
    return { publications: result.results.map(normalizeWork), total: result.meta.count, available: true };
  } catch (error) {
    console.error("Could not refresh Qing X. Li publication metadata", error);
    return { publications: [], total: 0, available: false };
  }
}

export async function getPublicationAuthor(): Promise<PublicationAuthor | null> {
  const authorId = process.env.OPENALEX_AUTHOR_ID?.trim() || DEFAULT_AUTHOR_ID;
  try {
    const author = await openAlexFetch<OpenAlexAuthorResponse>(apiUrl(`authors/${authorId}`, {
      select: "display_name,works_count,cited_by_count,summary_stats,ids,last_known_institutions",
    }));
    return {
      name: author.display_name,
      institution: author.last_known_institutions?.[0]?.display_name || "University of Hawaiʻi at Mānoa",
      worksCount: author.works_count,
      citedByCount: author.cited_by_count,
      hIndex: author.summary_stats?.h_index ?? null,
      i10Index: author.summary_stats?.i10_index ?? null,
      orcidUrl: author.ids?.orcid || null,
    };
  } catch (error) {
    console.error("Could not refresh Qing X. Li author metadata", error);
    return null;
  }
}
