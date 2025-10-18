// src/app/api/ping-email/route.ts
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get("to") || process.env.SMTP_USER || "";

  try {
    const res = await sendMail({
      to,
      subject: "Lab Website — Ping Email",
      html: `<p>This is a test email from your Vercel deployment.</p>`,
      text: "This is a test email from your Vercel deployment.",
    });

    return NextResponse.json({
      ok: true,
      to,
      result: res, // will show { ok:false, skipped:true } if SMTP envs missing
      using: {
        SMTP_HOST: !!process.env.SMTP_HOST,
        SMTP_PORT: !!process.env.SMTP_PORT,
        SMTP_USER: !!process.env.SMTP_USER,
        SMTP_PASS: !!process.env.SMTP_PASS,
        SMTP_FROM: !!process.env.SMTP_FROM,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
