import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import InstrumentManager from "./InstrumentManager";
import { getTranslations } from "next-intl/server";

export default async function InstrumentAdminPage() {
  const user = await getCurrentUser();
  const t = await getTranslations("sitePages.instrumentAdmin");
  if (!user?.isActive || user.role !== "ADMIN") redirect("/");
  const [instruments, requests] = await Promise.all([
    prisma.instrument.findMany({ orderBy: { name: "asc" } }),
    prisma.instrumentAccessRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  return <main style={{ display: "grid", gap: "1.5rem" }}>
    <header><h1>{t("title")}</h1><p className="muted">{t("subtitle")}</p></header>
    <InstrumentManager
      instruments={instruments}
      requests={requests.map((request) => ({
        id: request.id,
        name: request.name,
        department: request.department,
        supervisor: request.supervisor,
        email: request.email,
        instruments: (() => { try { return JSON.parse(request.requestedInstruments) as string[]; } catch { return [request.requestedInstruments]; } })(),
        experimentDescription: request.experimentDescription,
        trainingRequired: request.trainingRequired,
        createdAt: request.createdAt.toISOString(),
      }))}
    />
  </main>;
}
