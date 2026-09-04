import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function InstrumentsPage() {
  const instruments = await prisma.instrument.findMany({ orderBy: { name: "asc" } });
  const t = await getTranslations("sitePages.instruments");
  return <main style={{ display: "grid", gap: "1.5rem" }}>
    <header>
      <h1>{t("title")}</h1>
      <p className="muted">{t("subtitle")}</p>
    </header>
    <section className="instrument-grid" data-edit-ignore="true">
      {instruments.map((instrument) => <article className="card instrument-card" key={instrument.id}>
        <img src={instrument.imageUrl} alt={instrument.name} className="instrument-image" />
        <div style={{ paddingTop: "1rem", display: "grid", gap: ".75rem" }}>
          <div><span className={`status-label ${instrument.isAvailable ? "available" : "unavailable"}`}>{instrument.isAvailable ? t("available") : t("unavailable")}</span></div>
          <h2 style={{ margin: 0 }}>{instrument.name}</h2>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{instrument.description}</p>
          <p style={{ margin: 0 }}><strong>{t("location")}</strong> {instrument.location}</p>
          <div><Link className="btn btn-basic" href={`/instruments/request?instrument=${encodeURIComponent(instrument.id)}`}>{t("requestAccess")}</Link></div>
        </div>
      </article>)}
      {!instruments.length ? <div className="card"><p className="muted">{t("empty")}</p></div> : null}
    </section>
  </main>;
}
