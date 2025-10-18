// src/app/members/approval/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendMail } from "../../../lib/mailer";

function fmtUTC(d: Date | string | null | undefined) {
  if (!d) return "—";
  const iso = new Date(d).toISOString();
  return iso.replace("T", " ").slice(0, 16) + "Z";
}

function genTempPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*?";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Read the *actual* enum labels from Postgres (handles DBs that use DENIED instead of REJECTED) */
async function getInviteStatusLabels(): Promise<{ PENDING: string; APPROVED: string; REJECTED: string }> {
  const rows = await prisma.$queryRaw<Array<{ enumlabel: string; enumsortorder: number }>>`
    SELECT e.enumlabel, e.enumsortorder
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'InviteStatus'
    ORDER BY e.enumsortorder
  `;
  const byLower = new Map(rows.map(r => [r.enumlabel.toLowerCase(), r.enumlabel]));
  const pending  = byLower.get("pending")  ?? rows.find(r => /pend/i.test(r.enumlabel))?.enumlabel ?? rows[0]?.enumlabel ?? "PENDING";
  const approved = byLower.get("approved") ?? rows.find(r => /approv/i.test(r.enumlabel))?.enumlabel ?? rows[1]?.enumlabel ?? "APPROVED";
  const rejected = byLower.get("rejected")
                  ?? byLower.get("denied")
                  ?? rows.find(r => /reject|deni/i.test(r.enumlabel))?.enumlabel
                  ?? rows[2]?.enumlabel ?? "REJECTED";
  return { PENDING: pending, APPROVED: approved, REJECTED: rejected };
}

/* ---------------------- Server actions ---------------------- */

  async function approveAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;

    const invite = await prisma.pendingInvite.findUnique({
      where: { id },
      select: { email: true, slug: true, name: true, status: true, note: true },
    });
    if (!invite || invite.status !== "PENDING") return;

    // 1) generate temp password + hash
    const tempPassword = genTempPassword(); // your helper
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // 2) create/update the user with the slug from the invite
    const email = invite.email.toLowerCase();
    await prisma.user.upsert({
      where: { email },
      update: { name: invite.name ?? null, slug: invite.slug, passwordHash },
      create: {
        email,
        name: invite.name ?? null,
        role: "MEMBER",
        slug: invite.slug,             // ✅ ensure slug is set
        passwordHash,
      },
    });

    // 3) mark invite approved + append TEMP_PW to note
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    await prisma.pendingInvite.update({
      where: { id },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
        note: `${invite.note ?? ""} | TEMP_PW: ${tempPassword} | LINK: ${base}/reset-password`,
      },
    });

    // 4) email the user
    await sendMail({
      to: invite.email,
      subject: "Your Lab Website Account Approved",
      html: `
        <p>Hello ${invite.name ?? ""},</p>
        <p>Your lab website account has been approved.</p>
        <p><b>Temporary password:</b> ${tempPassword}</p>
        <p>Please set a new password here:<br>
        <a href="${base}/reset-password">${base}/reset-password</a></p>
      `,
    });

    revalidatePath("/members/approval");
  }

async function rejectAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;

  const labels = await getInviteStatusLabels();

  // Need the current slug + status
  const row = await prisma.pendingInvite.findUnique({
    where: { id },
    select: { slug: true, status: true },
  });
  if (!row || row.status !== labels.PENDING) return;

  // Free original slug by renaming (column is NOT nullable)
  const suffix = Date.now().toString(36).slice(-4);
  const freedSlug = `${row.slug}-rej-${suffix}`;

  await prisma.$executeRawUnsafe(
    `UPDATE "PendingInvite"
     SET "status" = $1::"InviteStatus",
         "decidedAt" = NOW(),
         "slug" = $2
     WHERE "id" = $3`,
    labels.REJECTED, // will be your DB's exact "DENIED"/"REJECTED"
    freedSlug,
    id
  );

  revalidatePath("/members/approval");
}

async function resetInviteAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;

  const labels = await getInviteStatusLabels();

  // Only allow reset if the row is REJECTED/DENIED (not after APPROVED)
  const row = await prisma.pendingInvite.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!row || row.status !== labels.REJECTED) return;

  await prisma.$executeRawUnsafe(
    `UPDATE "PendingInvite"
     SET "status" = $1::"InviteStatus",
         "decidedAt" = NULL
     WHERE "id" = $2`,
    labels.PENDING,
    id
  );

  revalidatePath("/members/approval");
}

async function deleteInviteAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.pendingInvite.delete({ where: { id } });
  revalidatePath("/members/approval");
}

/* ---------------------- Page ---------------------- */

export default async function ApprovalPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const isAdmin = typeof role === "string" && role.toUpperCase() === "ADMIN";
  if (!session || !isAdmin) redirect("/");

  const labels = await getInviteStatusLabels();

  // Show ALL rows (pending + decided). Pending first, then most recent decided.
  const invites = await prisma.$queryRaw<
    Array<{
      id: string;
      email: string;
      slug: string | null;
      name: string | null;
      status: string;
      requestedAt: Date;
      decidedAt: Date | null;
      note: string | null;
    }>
  >`
    SELECT "id","email","slug","name","status","requestedAt","decidedAt","note"
    FROM "PendingInvite"
    ORDER BY
      CASE WHEN "status" = ${labels.PENDING}::"InviteStatus" THEN 0 ELSE 1 END,
      COALESCE("decidedAt","requestedAt") DESC
  `;

  // Dynamic UI wording (DENY vs REJECT)
  const rejectedLabel = labels.REJECTED.toUpperCase();
  const denyVerb = rejectedLabel.includes("DENY") ? "Deny" : "Reject";

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Approval Dashboard</h1>
      <p className="text-sm text-gray-600">
        Approve creates a User with a temporary password and emails it to them. {denyVerb} frees the slug.
        Decided rows stay visible but are grayed out. Reset only shows for {denyVerb.toLowerCase()}ed rows.
      </p>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Requested</th>
              <th className="px-3 py-2">Decided</th>
              <th className="px-3 py-2">Applicant Note</th>
              <th className="px-3 py-2">Temp PW</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-gray-500" colSpan={9}>
                  No invites yet.
                </td>
              </tr>
            ) : (
              invites.map((x) => {
                const isPending = x.status === labels.PENDING;
                const isRejected = x.status === labels.REJECTED;

                // Extract temp PW (we appended to note on approval)
                let tempPw: string | null = null;
                if (x.note && x.note.includes("TEMP_PW: ")) {
                  tempPw = x.note.split("TEMP_PW: ").pop() ?? null;
                  if (tempPw && tempPw.includes(" | ")) tempPw = tempPw.split(" | ")[0];
                }
                const applicantNote = x.note?.replace(/\s*\|\s*TEMP_PW:.*$/, "") ?? null;

                return (
                  <tr key={x.id} className={`border-t ${!isPending ? "opacity-60" : ""}`}>
                    <td className="px-3 py-2">{x.email}</td>
                    <td className="px-3 py-2">{x.slug ?? <em className="text-gray-500">—</em>}</td>
                    <td className="px-3 py-2">{x.name ?? <em className="text-gray-500">—</em>}</td>
                    <td className="px-3 py-2">{x.status}</td>
                    <td className="px-3 py-2">
                      <time dateTime={new Date(x.requestedAt).toISOString()}>
                        {fmtUTC(x.requestedAt)}
                      </time>
                    </td>
                    <td className="px-3 py-2">
                      <time dateTime={x.decidedAt ? new Date(x.decidedAt).toISOString() : undefined}>
                        {fmtUTC(x.decidedAt)}
                      </time>
                    </td>
                    <td className="px-3 py-2">
                      {applicantNote ? (
                        <span className="whitespace-pre-wrap">{applicantNote}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {tempPw ? <code>{tempPw}</code> : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {/* Approve / Reject only while PENDING */}
                        {isPending && (
                          <>
                            <form action={approveAction}>
                              <input type="hidden" name="id" value={x.id} />
                              <button className="px-3 py-1 rounded bg-green-600 text-white">
                                Approve
                              </button>
                            </form>
                            <form action={rejectAction}>
                              <input type="hidden" name="id" value={x.id} />
                              <button className="px-3 py-1 rounded bg-red-600 text-white">
                                {denyVerb}
                              </button>
                            </form>
                          </>
                        )}

                        {/* Reset only for rejected/denied rows */}
                        {isRejected && (
                          <form action={resetInviteAction}>
                            <input type="hidden" name="id" value={x.id} />
                            <button
                              className="px-3 py-1 rounded bg-yellow-600 text-white"
                              title="Set back to PENDING (keeps note)"
                            >
                              Reset
                            </button>
                          </form>
                        )}

                        {/* Delete always available */}
                        <form action={deleteInviteAction}>
                          <input type="hidden" name="id" value={x.id} />
                          <button className="px-3 py-1 rounded bg-gray-700 text-white">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
