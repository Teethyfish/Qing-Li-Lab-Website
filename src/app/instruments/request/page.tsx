import Link from "next/link";
import { prisma } from "@/lib/prisma";
import InstrumentRequestForm from "./InstrumentRequestForm";

type Props = { searchParams: Promise<{ instrument?: string }> };

export default async function InstrumentRequestPage({ searchParams }: Props) {
  const { instrument } = await searchParams;
  const instruments = await prisma.instrument.findMany({ select: { id: true, name: true, isAvailable: true }, orderBy: { name: "asc" } });
  return <main style={{ display: "grid", gap: "1.5rem", maxWidth: 820 }}>
    <header><p><Link href="/instruments">← Back to instruments</Link></p><h1>Request Instrument Access</h1><p className="muted">Provide enough detail for the lab to evaluate your request and contact you about availability, training, and scheduling.</p></header>
    <InstrumentRequestForm instruments={instruments} initialInstrumentId={instrument} />
  </main>;
}
