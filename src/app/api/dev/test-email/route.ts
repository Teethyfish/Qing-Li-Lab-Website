// src/app/api/dev/test-email/route.ts
import { NextResponse } from "next/server";
import { sendMail } from "../../../../lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const to = String(body.to || "");
    if (!to)
      return NextResponse.json({ error: "Provide 'to' in JSON body" }, { status: 400 });

    const info = await sendMail({
      to,
      subject: "Lab Website — test email",
      html: `<p>This is a <b>test email</b> from your Lab Website. ✅</p>`,
    });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
