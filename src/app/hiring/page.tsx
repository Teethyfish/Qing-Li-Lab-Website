import { getTranslations } from "next-intl/server";

export default async function HiringPage() {
  const t = await getTranslations("sitePages.hiring");
  return (
    <main style={{ maxWidth: 900, display: "grid", gap: "1.5rem" }}>
      <header>
        <h1>{t("title")}</h1>
        <p className="muted">{t("subtitle")}</p>
      </header>
      <section className="card" style={{ padding: "2rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("openings")}</h2>
        <p>{t("notLooking")}</p>
        <p>
          {t("contactBefore")}{" "}
          <a href="mailto:qingl@hawaii.edu">qingl@hawaii.edu</a>.
        </p>
      </section>
    </main>
  );
}
