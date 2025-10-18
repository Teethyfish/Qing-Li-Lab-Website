// src/lib/mailer.ts
// Prefer Resend (HTTP) if RESEND_API_KEY is set; otherwise fall back to SMTP.
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

  // Use a safe default that works without domain verification
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

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

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // 465=SSL, 587=STARTTLS
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

export async function sendMail(args: MailArgs) {
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend(args);
    } catch (err) {
      console.error("sendMail via Resend failed, falling back to SMTP:", err);
    }
  }
  return await sendViaSmtp(args);
}
