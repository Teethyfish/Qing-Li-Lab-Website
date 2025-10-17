// src/lib/mailer.ts
import nodemailer from "nodemailer";

// throw a clear error if any required env is missing
function req(name: string, v?: string) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const host = req("SMTP_HOST", process.env.SMTP_HOST);
const port = Number(process.env.SMTP_PORT || 587);
const user = req("SMTP_USER", process.env.SMTP_USER);
const pass = req("SMTP_PASS", process.env.SMTP_PASS);
const from = req("SMTP_FROM", process.env.SMTP_FROM);

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for 587/25
  auth: { user, pass },
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  return transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
