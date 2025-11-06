// src/app/members/users/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

/* ---------- page-builder config helper ---------- */
type AppRow = { value: string };
async function getConfig<T = unknown>(key: string): Promise<T | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<AppRow[]>(
      `select value from "AppConfig" where key = $1 limit 1`,
      key
    );
    if (!rows?.[0]?.value) return null;
    return JSON.parse(rows[0].value) as T;
  } catch {
    return null;
  }
}

type UsersPageCfg = {
  heading?: string;
  intro?: string;
  showResetCol?: boolean;
  showSlugCol?: boolean;
};
/* ------------------------------------------------ */

type URow = {
  id: string;
  email: string;
  name: string | null;
  slug: string | null;
  role: "ADMIN" | "MEMBER";
  mustResetPassword: boolean;
};

export default async function UsersAdminPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role && role.toUpperCase() === "ADMIN";
  if (!isAdmin) redirect("/");

  const t = await getTranslations('users');

  const cfg = (await getConfig<UsersPageCfg>("members.users.page")) ?? {};

  const users = (await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      slug: true,
      role: true,
      mustResetPassword: true,
    },
  })) as URow[];

  /* ------------------- server actions ------------------- */
  async function setRole(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const role = String(formData.get("role") || "");
    if (!id || (role !== "ADMIN" && role !== "MEMBER")) return;
    await prisma.user.update({ where: { id }, data: { role: role as any } });
    revalidatePath("/members/users");
  }

  async function toggleReset(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const flag = String(formData.get("flag") || "") === "true";
    if (!id) return;
    await prisma.user.update({
      where: { id },
      data: { mustResetPassword: flag },
    });
    revalidatePath("/members/users");
  }

  // 🔒 Require typing DELETE to proceed (server-side check, no client JS needed)
  async function deleteUser(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const confirm = String(formData.get("confirm") || "");
    if (!id || confirm !== "DELETE") return; // silently ignore if not confirmed
    await prisma.user.delete({ where: { id } });
    revalidatePath("/members/users");
  }
  /* ------------------------------------------------------ */

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          {cfg.heading || t('heading')}
        </h1>
        {cfg.intro && <p className="muted">{cfg.intro}</p>}
      </header>

      <div className="tile" style={{ padding: "0.5rem" }}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>{t('tableEmail')}</th>
                <th style={{ textAlign: "left", padding: "8px" }}>{t('tableName')}</th>
                {cfg.showSlugCol !== false && (
                  <th style={{ textAlign: "left", padding: "8px" }}>{t('tableSlug')}</th>
                )}
                <th style={{ textAlign: "left", padding: "8px" }}>{t('tableRole')}</th>
                {cfg.showResetCol !== false && (
                  <th style={{ textAlign: "left", padding: "8px" }}>{t('tableMustResetPW')}</th>
                )}
                <th style={{ textAlign: "left", padding: "8px" }}>{t('tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: "10px" }}>
                    {t('noUsers')}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid #e5e7eb55" }}>
                    <td style={{ padding: "8px" }}>{u.email}</td>
                    <td style={{ padding: "8px" }}>{u.name ?? <em className="muted">—</em>}</td>
                    {cfg.showSlugCol !== false && (
                      <td style={{ padding: "8px" }}>{u.slug ?? <em className="muted">—</em>}</td>
                    )}
                    <td style={{ padding: "8px" }}>{u.role}</td>
                    {cfg.showResetCol !== false && (
                      <td style={{ padding: "8px" }}>{u.mustResetPassword ? t('yes') : t('no')}</td>
                    )}
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {/* Promote / Demote */}
                        <form action={setRole}>
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            type="hidden"
                            name="role"
                            value={u.role === "ADMIN" ? "MEMBER" : "ADMIN"}
                          />
                          <button className="btn btn-muted" type="submit">
                            {u.role === "ADMIN" ? t('demoteToMember') : t('promoteToAdmin')}
                          </button>
                        </form>

                        {/* Toggle mustResetPassword */}
                        {cfg.showResetCol !== false && (
                          <form action={toggleReset}>
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              type="hidden"
                              name="flag"
                              value={(!u.mustResetPassword).toString()}
                            />
                            <button className="btn btn-basic" type="submit">
                              {u.mustResetPassword ? t('clearResetFlag') : t('requireReset')}
                            </button>
                          </form>
                        )}

                        {/* Delete (with typed confirmation) */}
                        <form action={deleteUser} style={{ display: "flex", gap: "0.4rem" }}>
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            name="confirm"
                            placeholder={t('typeDELETE')}
                            aria-label="Type DELETE to confirm"
                            style={{
                              width: 120,
                              padding: "0.5rem 0.6rem",
                              borderRadius: 10,
                              border:
                                "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
                              background: "var(--color-card)",
                              boxSizing: "border-box",
                            }}
                          />
                          <button className="btn btn-warning" type="submit" title="Delete user">
                            {t('delete')}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
