import Link from "next/link";
import { prisma } from "@/lib/prisma";
import InstrumentRequestForm from "./InstrumentRequestForm";
import { getTranslations } from "next-intl/server";

type Props = { searchParams: Promise<{ instrument?: string }> };

export default async function InstrumentRequestPage({ searchParams }: Props) {
  const { instrument } = await searchParams;
  const instruments = await prisma.instrument.findMany({ select: { id: true, name: true, isAvailable: true }, orderBy: { name: "asc" } });
  const t = await getTranslations("sitePages.instrumentRequest");
  return <main style={{ display: "grid", gap: "1.5rem", maxWidth: 820 }}>
    <header><p><Link href="/instruments">{t("back")}</Link></p><h1>{t("title")}</h1><p className="muted">{t("subtitle")}</p></header>
    <InstrumentRequestForm instruments={instruments} initialInstrumentId={instrument} />
  </main>;
}
