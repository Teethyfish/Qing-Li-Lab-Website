import { NextResponse } from "next/server";
import { instrumentRequestEmailHtml } from "@/lib/instrument-request-email";
import { sendGoogleMail } from "@/lib/google";
import { prisma } from "@/lib/prisma";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (text(body.website, 200)) return NextResponse.json({ success: true });

    const name = text(body.name, 160);
    const department = text(body.department, 240);
    const supervisor = text(body.supervisor, 240) || null;
    const email = text(body.email, 320).toLowerCase();
    const experimentDescription = text(body.experimentDescription, 8_000);
    const instrumentIds = Array.isArray(body.instrumentIds)
      ? [...new Set(body.instrumentIds.filter((id): id is string => typeof id === "string"))].slice(0, 20)
      : [];
    const trainingRequired = body.trainingRequired === true;

    if (!name || !department || !email || !/^\S+@\S+\.\S+$/.test(email) || !experimentDescription || !instrumentIds.length) {
      return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
    }

    const recentCount = await prisma.instrumentAccessRequest.count({
      where: { email, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recentCount >= 3) {
      return NextResponse.json({ error: "Too many recent requests from this email address. Please try again later." }, { status: 429 });
    }

    const instruments = await prisma.instrument.findMany({
      where: { id: { in: instrumentIds } },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    if (!instruments.length) {
      return NextResponse.json({ error: "Select at least one listed instrument." }, { status: 400 });
    }
    const instrumentNames = instruments.map((instrument) => instrument.name);
    const submission = await prisma.instrumentAccessRequest.create({
      data: {
        name,
        department,
        supervisor,
        email,
        requestedInstruments: JSON.stringify(instrumentNames),
        experimentDescription,
        trainingRequired,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true, email: true },
    });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "New instrument access request",
          message: `${name} requested access to ${instrumentNames.join(", ")}.`,
          href: "/members/instruments#access-requests",
        })),
      });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const html = instrumentRequestEmailHtml({
      name,
      department,
      supervisor,
      email,
      instruments: instrumentNames,
      experimentDescription,
      trainingRequired,
      submittedAt: submission.createdAt,
      adminUrl: `${siteUrl}/members/instruments#access-requests`,
    });
    const destinations = [...new Set(["qinglilab@gmail.com", ...admins.map((admin) => admin.email.toLowerCase())])];
    const results = await Promise.allSettled(destinations.map((to) => sendGoogleMail({
      to,
      subject: `Instrument access request — ${name}`,
      html,
    })));
    const emailFailures = results.filter((result) => result.status === "rejected").length;

    return NextResponse.json({ success: true, emailFailures });
  } catch (error) {
    console.error("Instrument request failed:", error);
    return NextResponse.json({ error: "Your request could not be submitted. Please try again." }, { status: 500 });
  }
}
