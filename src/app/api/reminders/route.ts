import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { message?: unknown; remindAt?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2_000) : "";
  const remindAt = typeof body?.remindAt === "string" ? new Date(body.remindAt) : new Date(NaN);
  if (!message || Number.isNaN(remindAt.getTime()) || remindAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Enter a message and a future reminder time." }, { status: 400 });
  }
  if (remindAt.getTime() > Date.now() + 5 * 365 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Reminders can be scheduled up to five years ahead." }, { status: 400 });
  }
  const reminder = await prisma.reminder.create({ data: { userId: user.id, message, remindAt } });
  return NextResponse.json({ reminder: { ...reminder, remindAt: reminder.remindAt.toISOString(), emailedAt: null } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  const removed = await prisma.reminder.deleteMany({ where: { id, userId: user.id } });
  if (!removed.count) return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
