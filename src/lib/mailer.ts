// src/lib/mailer.ts
// Sends email via Resend (HTTP) if RESEND_API_KEY is set; otherwise falls back to SMTP (nodemailer).
import nodemailer from "nodemailer";

type MailArgs = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

async function sendViaResend(args: MailArgs) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, skipped: true as const, reason: "no_resend_key" };

  const from = process.env.SMTP_FROM || "Lab Website <no-reply@lab.local>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error: ${res.status} ${res.statusText} ${body}`);
  }

  const data = (await res.json().catch(() => ({}))) as any;
  return { ok: true as const, id: data?.id ?? null, transport: "resend" as const };
}

async function sendViaSmtp(args: MailArgs) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return { ok: false as const, skipped: true as const, reason: "missing_smtp_envs" };
  }

  // Use STARTTLS on 587; Gmail works with this.
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });

  return { ok: true as const, id: info.messageId, transport: "smtp" as const };
}

/** Public helper used across the app */
export async function sendMail(args: MailArgs) {
  // Prefer Resend in production (HTTP-based; no DNS/port issues)
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend(args);
    } catch (err) {
      console.error("sendMail via Resend failed, will try SMTP next:", err);
    }
  }

  // Fallback to SMTP (works locally)
  try {
    return await sendViaSmtp(args);
  } catch (err) {
    console.error("sendMail via SMTP failed:", err);
    throw err;
  }
}
