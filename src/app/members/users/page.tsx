// src/app/members/users/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

function fmtUTC(d: Date | string | null | undefined) {
  if (!d) return "—";
  const iso = new Date(d).toISOString();
  return iso.replace("T", " ").slice(0, 16) + "Z";
}

/* -------------------- server helpers -------------------- */
async function getMe() {
  const session = await getServerSession(authOptions);
  const meEmail = (session?.user as any)?.email as string | undefined;
  if (!session || !meEmail) return null;
  const me = await prisma.user.findUnique({
    where: { email: meEmail },
    select: { id: true, email: true, role: true },
  });
  return me;
}

async function ensureNotSelf(targetId: string) {
  const me = await getMe();
  if (!me) return false;
  return me.id !== targetId; // true if allowed (target != me)
}

async function isLastAdmin(targetId?: string | null) {
  // Count current admins (optionally excluding target if provided)
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true },
  });
  if (admins.length <= 1) {
    // If only one admin exists, it's the last admin if either:
    // - no target provided, or
    // - the only admin IS the target
    return !targetId || admins[0].id === targetId;
  }
  return false;
}

/* -------------------- server actions -------------------- */

async function promoteAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.user.update({
    where: { id },
    data: { role: Role.ADMIN },
  });

  revalidatePath("/members/users");
}

async function demoteAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;

  // 1) don't demote yourself
  if (!(await ensureNotSelf(id))) return;

  // 2) don't demote the last remaining admin
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === Role.ADMIN && (await isLastAdmin(id))) return;

  await prisma.user.update({
    where: { id },
    data: { role: Role.MEMBER },
  });

  revalidatePath("/members/users");
}

async function deleteUserAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const confirmText = String(formData.get("confirm") || "");
  if (!id) return;

  // require exact word DELETE (server-side)
  if (confirmText !== "DELETE") return;

  // 1) don't delete yourself
  if (!(await ensureNotSelf(id))) return;

  // 2) don't delete the last remaining admin
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === Role.ADMIN && (await isLastAdmin(id))) return;

  await prisma.user.delete({ where: { id } });

  revalidatePath("/members/users");
}

/* -------------------- page -------------------- */

export default async function UsersAdminPage() {
  // protect route — admins only
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const isAdmin = typeof role === "string" && role.toUpperCase() === "ADMIN";
  if (!session || !isAdmin) redirect("/");

  const meEmail = (session?.user as any)?.email as string | undefined;

  // load users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      about: true,
    },
  });

  // find me (for UI guards)
  const me = meEmail
    ? users.find((u) => (u.email || "").toLowerCase() === meEmail.toLowerCase())
    : undefined;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Users (Admin)</h1>
      <p className="text-sm text-gray-600">
        Promote/demote roles and delete users. You can’t demote or delete yourself, and you can’t remove the last admin.
      </p>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">About</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-gray-500" colSpan={7}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isAdminUser = String(u.role).toUpperCase() === "ADMIN";
                const isMe = !!me && u.id === me.id;

                return (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">
                      {u.name ?? <em className="text-gray-500">—</em>}
                    </td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">
                      <time dateTime={new Date(u.createdAt as any).toISOString()}>
                        {fmtUTC(u.createdAt as any)}
                      </time>
                    </td>
                    <td className="px-3 py-2">
                      <time dateTime={new Date(u.updatedAt as any).toISOString()}>
                        {fmtUTC(u.updatedAt as any)}
                      </time>
                    </td>
                    <td className="px-3 py-2">
                      {u.about ? (
                        <span className="whitespace-pre-wrap">{u.about}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        {/* Promote (only if not already admin) */}
                        {!isAdminUser && (
                          <form action={promoteAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              className="px-3 py-1 rounded bg-blue-600 text-white"
                              title="Promote to Admin"
                            >
                              Promote
                            </button>
                          </form>
                        )}

                        {/* Demote (only if admin AND not me) */}
                        {isAdminUser && !isMe && (
                          <form action={demoteAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              className="px-3 py-1 rounded bg-indigo-600 text-white"
                              title="Demote to Member"
                            >
                              Demote
                            </button>
                          </form>
                        )}

                        {/* Delete (never allow for self) */}
                        {!isMe && (
                          <form action={deleteUserAction} className="flex gap-2 items-center">
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              name="confirm"
                              placeholder="type DELETE"
                              className="px-2 py-1 border rounded text-xs"
                            />
                            <button
                              className="px-3 py-1 rounded bg-gray-700 text-white"
                              title="Delete user (type DELETE first)"
                            >
                              Delete
                            </button>
                          </form>
                        )}
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
