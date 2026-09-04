import { escapeHtml } from "@/lib/document-access";

export function instrumentRequestEmailHtml(args: {
  name: string;
  department: string;
  supervisor: string | null;
  email: string;
  instruments: string[];
  experimentDescription: string;
  trainingRequired: boolean;
  submittedAt: Date;
  adminUrl: string;
}) {
  const row = (label: string, value: string) => `<tr>
    <td style="width:170px;padding:9px 12px;background:#f3f4f6;border:1px solid #d1d5db;vertical-align:top;"><strong>${escapeHtml(label)}</strong></td>
    <td style="padding:9px 12px;border:1px solid #d1d5db;vertical-align:top;">${value}</td>
  </tr>`;
  const submitted = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(args.submittedAt);

  return `<!doctype html><html lang="en"><body style="margin:0;background:#f3f4f6;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#fff;border:1px solid #d1d5db;">
      <tr><td style="padding:26px 30px;border-bottom:3px solid #1f2937;"><h1 style="margin:0;font-size:23px;">New Instrument Access Request</h1></td></tr>
      <tr><td style="padding:26px 30px;font-size:15px;line-height:1.6;">
        <p style="margin:0 0 20px;">A new instrument access request was submitted through the lab website.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin-bottom:22px;">
          ${row("Name", escapeHtml(args.name))}
          ${row("Department", escapeHtml(args.department))}
          ${row("Supervisor", escapeHtml(args.supervisor || "Not provided"))}
          ${row("Email", `<a href="mailto:${escapeHtml(args.email)}">${escapeHtml(args.email)}</a>`)}
          ${row("Instrument(s)", args.instruments.map(escapeHtml).join("<br>"))}
          ${row("Training", args.trainingRequired ? "Required" : "Not required")}
          ${row("Submitted", escapeHtml(submitted))}
        </table>
        <h2 style="margin:0 0 8px;font-size:17px;">Experiment and sample description</h2>
        <div style="padding:14px 16px;background:#f9fafb;border-left:4px solid #4b5563;white-space:normal;">${escapeHtml(args.experimentDescription).replaceAll("\n", "<br>")}</div>
        <p style="margin:24px 0 0;"><a href="${escapeHtml(args.adminUrl)}" style="display:inline-block;padding:11px 18px;background:#1f2937;color:#fff;text-decoration:none;font-weight:bold;">Review Request on the Lab Website</a></p>
      </td></tr>
      <tr><td style="padding:16px 30px;background:#f9fafb;border-top:1px solid #d1d5db;font-size:12px;color:#6b7280;">This is an automated email from the Qing X. Li Lab website. Please do not reply to this message.</td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}
