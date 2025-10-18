// src/lib/mailer.ts
import nodemailer from "nodemailer";

type MailArgs = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

/**
 * Sends an email using SMTP env vars.
 * If SMTP envs are missing (e.g., on local/preview builds), it logs and no-ops instead of crashing.
 */
export async function sendMail({ to, subject, html, text }: MailArgs) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  // Gracefully skip if not configured (prevents build-time crashes)
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.warn(
      "sendMail skipped: missing SMTP env vars (SMTP_HOST/PORT/USER/PASS/FROM)."
    );
    return { ok: false, skipped: true as const };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // 465 = SSL
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  return { ok: true as const, messageId: info.messageId };
}
