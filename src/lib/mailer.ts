// src/lib/mailer.ts
import nodemailer from "nodemailer";

type MailArgs = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

async function sendViaResend(args: MailArgs) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  if (!key || !from) {
    return {
      ok: false as const,
      skipped: true as const,
      reason: "missing_resend_envs",
    };
  }

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

  const bodyText = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Resend ${res.status} ${res.statusText} :: ${bodyText}`);
  }

  let data: any = {};
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch {}

  return { ok: true as const, id: data?.id ?? null, transport: "resend" as const };
}

async function sendViaSmtp(args: MailArgs) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return {
      ok: false as const,
      skipped: true as const,
      reason: "missing_smtp_envs",
    };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const fromWithLabel = `"DO NOT REPLY" <${SMTP_FROM}>`;

  const info = await transporter.sendMail({
    from: fromWithLabel,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });

  return { ok: true as const, id: info.messageId, transport: "smtp" as const };
}

export async function sendMail(args: MailArgs) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  const smtpReady =
    SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM;

  if (smtpReady) {
    return await sendViaSmtp(args);
  }

  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    return await sendViaResend(args);
  }

  throw new Error(
    "No email transport configured. Set either SMTP_* or RESEND_* environment variables."
  );
}
