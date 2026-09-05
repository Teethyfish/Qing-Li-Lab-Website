import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendGoogleMail } from "@/lib/google";
import { sendMail } from "@/lib/mailer";

const GENERIC_MESSAGE = "If an active account exists for that email, a reset link has been sent.";
const RESET_LIFETIME_MS = 30 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function resetBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  return (configured || new URL(request.url).origin).replace(/\/$/, "");
}

async function sendResetEmail(to: string, name: string | null, resetUrl: string) {
  const safeName = escapeHtml(name?.trim() || "Lab member");
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;max-width:620px;margin:0 auto">
      <h1 style="font-size:22px;margin:0 0 18px">Reset your Qing Li Lab password</h1>
      <p>Hello ${safeName},</p>
      <p>A password reset was requested for your lab website account. This link expires in 30 minutes and can only be used once.</p>
      <p style="margin:24px 0"><a href="${resetUrl}" style="display:inline-block;padding:11px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:2px;font-weight:700">Reset password</a></p>
      <p style="font-size:13px;color:#4b5563;overflow-wrap:anywhere">If the button does not work, copy this address into your browser:<br>${resetUrl}</p>
      <p>If you did not request this reset, you can ignore this email. Your existing password will continue to work.</p>
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#6b7280">This is an automated email from the Qing Li Lab website. Please do not reply.</p>
    </div>`;
  const text = `Hello ${name?.trim() || "Lab member"},\n\nReset your Qing Li Lab password using this link:\n${resetUrl}\n\nThe link expires in 30 minutes and can only be used once. If you did not request this, ignore this email.\n\nThis is an automated email from the Qing Li Lab website. Please do not reply.`;

  try {
    await sendGoogleMail({ to, subject: "Reset your Qing Li Lab website password", html });
  } catch (googleError) {
    try {
      await sendMail({ to, subject: "Reset your Qing Li Lab website password", html, text });
    } catch (fallbackError) {
      console.error("Password reset email delivery failed", { googleError, fallbackError });
      throw new Error("Password reset email delivery failed");
    }
  }
}

export async function POST(request: Request) {
  let createdTokenId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        passwordResetTokens: {
          where: { usedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    // Do not reveal whether a submitted address belongs to an account.
    if (!user?.isActive) return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    const mostRecent = user.passwordResetTokens[0]?.createdAt.getTime() ?? 0;
    if (Date.now() - mostRecent < RESEND_DELAY_MS) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_LIFETIME_MS);
    const created = await prisma.$transaction(async (database) => {
      await database.passwordResetToken.deleteMany({ where: { userId: user.id } });
      return database.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
    });
    createdTokenId = created.id;

    const resetUrl = `${resetBaseUrl(request)}/reset-password?token=${encodeURIComponent(token)}`;
    await sendResetEmail(user.email, user.name, resetUrl);
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (error) {
    if (createdTokenId) {
      await prisma.passwordResetToken.deleteMany({ where: { id: createdTokenId } }).catch(() => undefined);
    }
    console.error("Password reset request failed", error);
    return NextResponse.json(
      { error: "The reset email could not be sent right now. Please try again later or contact an administrator." },
      { status: 503 }
    );
  }
}
