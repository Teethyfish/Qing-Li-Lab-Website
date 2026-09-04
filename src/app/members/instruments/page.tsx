import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import InstrumentManager from "./InstrumentManager";

export default async function InstrumentAdminPage() {
  const user = await getCurrentUser();
  if (!user?.isActive || user.role !== "ADMIN") redirect("/");
  const [instruments, requests] = await Promise.all([
    prisma.instrument.findMany({ orderBy: { name: "asc" } }),
    prisma.instrumentAccessRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  return <main style={{ display: "grid", gap: "1.5rem" }}>
    <header><h1>Manage Instruments</h1><p className="muted">Add equipment, control public availability, and review access requests.</p></header>
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
