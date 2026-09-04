import { NextResponse } from "next/server";
import { escapeHtml } from "@/lib/document-access";
import { sendGoogleMail } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.reminder.findMany({
    where: { emailedAt: null, remindAt: { lte: new Date() }, user: { isActive: true } },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { remindAt: "asc" },
    take: 50,
  });
  let sent = 0;
  let failed = 0;
  for (const reminder of due) {
    const claimedAt = new Date();
    const claimed = await prisma.reminder.updateMany({ where: { id: reminder.id, emailedAt: null }, data: { emailedAt: claimedAt } });
    if (!claimed.count) continue;
    try {
      await sendGoogleMail({
        to: reminder.user.email,
        subject: "Qing X. Li Lab reminder",
        html: `<!doctype html><html lang="en"><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">
          <div style="max-width:620px;margin:0 auto;border:1px solid #d1d5db;">
            <div style="padding:24px 28px;border-bottom:3px solid #1f2937;"><h1 style="font-size:22px;margin:0;">Lab Website Reminder</h1></div>
            <div style="padding:24px 28px;"><p>Hello ${escapeHtml(reminder.user.name || "lab member")},</p><div style="padding:14px 16px;background:#f9fafb;border-left:4px solid #4b5563;">${escapeHtml(reminder.message).replaceAll("\n", "<br>")}</div></div>
            <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #d1d5db;font-size:12px;color:#6b7280;">This is an automated reminder from the Qing X. Li Lab website. Please do not reply.</div>
          </div></body></html>`,
      });
      await prisma.notification.create({ data: { userId: reminder.userId, title: "Reminder", message: reminder.message, href: "/members/notes" } });
      sent += 1;
    } catch (error) {
      console.error(`Reminder ${reminder.id} failed:`, error);
      await prisma.reminder.update({ where: { id: reminder.id }, data: { emailedAt: null } });
      failed += 1;
    }
  }
  return NextResponse.json({ processed: due.length, sent, failed });
}
