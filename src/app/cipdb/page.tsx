import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function CipdbPage() {
  const t = await getTranslations("sitePages.cipdb");
  return <main className="cipdb-page">
    <section className="tile cipdb-placeholder-page">
      <div className="cipdb-logo-placeholder" aria-hidden="true">π</div>
      <p className="research-project-kicker">CIPDB</p>
      <h1>{t("title")}</h1>
      <p>{t("comingSoon")}</p>
      <Link className="btn btn-muted" href="/">{t("back")}</Link>
    </section>
  </main>;
}
