import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { publicMediaUrl } from "@/lib/media-url";

export default async function InstrumentsPage() {
  const instruments = await prisma.instrument.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, description: true, location: true, isAvailable: true, updatedAt: true } });
  const t = await getTranslations("sitePages.instruments");
  return <main style={{ display: "grid", gap: "1.5rem" }}>
    <header>
      <h1>{t("title")}</h1>
      <p className="muted">{t("subtitle")}</p>
    </header>
    <section className="instrument-grid" data-edit-ignore="true">
      {instruments.map((instrument) => <article className="card instrument-card" key={instrument.id}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={publicMediaUrl("instrument", instrument.id, "image", instrument.updatedAt)} alt={instrument.name} className="instrument-image" />
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
