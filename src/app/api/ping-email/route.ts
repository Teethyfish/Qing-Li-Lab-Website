export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get("to") || process.env.SMTP_USER || "";

  const flags = {
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    RESEND_FROM: !!process.env.RESEND_FROM,
    SMTP_HOST: !!process.env.SMTP_HOST,
    SMTP_PORT: !!process.env.SMTP_PORT,
    SMTP_USER: !!process.env.SMTP_USER,
    SMTP_PASS: !!process.env.SMTP_PASS,
    SMTP_FROM: !!process.env.SMTP_FROM,
  };

  try {
    const result = await sendMail({
      to,
      subject: "Lab Website — Ping Email",
      html: `<p>This is a test email from your Vercel deployment.</p>`,
      text: "This is a test email from your Vercel deployment.",
    });

    return NextResponse.json({ ok: true, to, result, flags });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err), flags },
      { status: 500 }
    );
  }
}
