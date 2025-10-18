// src/lib/mailer.ts
import nodemailer from "nodemailer";

type MailArgs = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

function getEnv(name: string) {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : undefined;
}

async function sendViaResend(args: MailArgs) {
  const key = getEnv("RESEND_API_KEY");
  const from = getEnv("RESEND_FROM") || "onboarding@resend.dev";
  if (!key || !from) {
    return { ok: false as const, skipped: true as const, reason: "missing_resend_envs" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: args.to, subject: args.subject, html: args.html, text: args.text }),
  });

  const bodyText = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Resend ${res.status} ${res.statusText} :: ${bodyText}`);

  let data: any = {};
  try { data = bodyText ? JSON.parse(bodyText) : {}; } catch {}
  return { ok: true as const, id: data?.id ?? null, transport: "resend" as const };
}

async function sendViaSmtp(args: MailArgs) {
  const SMTP_HOST = getEnv("SMTP_HOST");
  const SMTP_PORT = getEnv("SMTP_PORT");
  const SMTP_USER = getEnv("SMTP_USER");
  const SMTP_PASS = getEnv("SMTP_PASS");
  const SMTP_FROM = getEnv("SMTP_FROM"); // <-- will be used verbatim

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return { ok: false as const, skipped: true as const, reason: "missing_smtp_envs" };
  }

  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465=SSL, 587=STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const info = await transporter.sendMail({
    from: SMTP_FROM, // <-- no auto-prefixing; uses env exactly
    to: args.to.trim(),
    subject: args.subject,
    text: args.text,
    html: args.html,
  });

  return { ok: true as const, id: info.messageId, transport: "smtp" as const };
}

export async function sendMail(args: MailArgs) {
  const hasSMTP =
    !!getEnv("SMTP_HOST") &&
    !!getEnv("SMTP_PORT") &&
    !!getEnv("SMTP_USER") &&
    !!getEnv("SMTP_PASS") &&
    !!getEnv("SMTP_FROM");

  if (hasSMTP) return await sendViaSmtp(args);
  if (getEnv("RESEND_API_KEY") && getEnv("RESEND_FROM")) return await sendViaResend(args);

  throw new Error("No email transport configured. Set SMTP_* or RESEND_* env vars.");
}
