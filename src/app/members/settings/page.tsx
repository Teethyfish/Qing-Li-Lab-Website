// src/app/members/settings/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { localeNames, locales } from "@/i18n/config";
import bcrypt from "bcryptjs";

type SettingsPageProps = {
  searchParams: Promise<{ password?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { password: passwordStatus } = await searchParams;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, name: true, locale: true },
  });

  if (!user) redirect("/login");

  const t = await getTranslations('settings');

  // Server action to update language
  async function updateLanguage(formData: FormData) {
    "use server";
    const locale = String(formData.get("locale") || "en");
    const actionSession = await getServerSession(authOptions);
    const actionEmail = actionSession?.user?.email?.toLowerCase();

    if (!actionEmail || !locales.includes(locale as (typeof locales)[number])) {
      return;
    }

    await prisma.user.update({
      where: { email: actionEmail },
      data: { locale },
    });

    revalidatePath("/members/settings");
    redirect("/members/settings");
  }

  // Server action to change password
  async function changePassword(formData: FormData) {
    "use server";
    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    const actionSession = await getServerSession(authOptions);
    const actionEmail = actionSession?.user?.email?.toLowerCase();
    if (!actionEmail) redirect("/login");

    if (newPassword.length < 8) {
      redirect("/members/settings?password=too-short");
    }
    if (newPassword !== confirmPassword) {
      redirect("/members/settings?password=mismatch");
    }

    const account = await prisma.user.findUnique({
      where: { email: actionEmail },
      select: { id: true, passwordHash: true },
    });
    if (!account || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
      redirect("/members/settings?password=incorrect");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: account.id },
      data: { passwordHash },
    });
    revalidatePath("/members/settings");
    redirect("/members/settings?password=updated");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.7rem",
    borderRadius: 10,
    border: "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
    background: "var(--color-card)",
    boxSizing: "border-box",
  };

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>
          {t('title')}
        </h1>
        <p className="muted">{t('subtitle')}</p>
      </header>

      {/* Account Settings */}
      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          {t('accountSettings')}
        </h2>

        <div className="tile" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            {t('email')}
          </h3>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {user.email}
          </div>
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
            {t('emailNote')}
          </p>
        </div>

        <div className="tile" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
            {t('changePassword')}
          </h3>
          <form action={changePassword} style={{ display: "grid", gap: "1rem" }}>
            {passwordStatus && (
              <p
                role="status"
                style={{
                  color: passwordStatus === "updated" ? "#15803d" : "#b91c1c",
                  margin: 0,
                }}
              >
                {passwordStatus === "updated"
                  ? "Password updated successfully."
                  : passwordStatus === "too-short"
                    ? "The new password must be at least 8 characters."
                    : passwordStatus === "mismatch"
                      ? "The new passwords do not match."
                      : "The current password is incorrect."}
              </p>
            )}
            <div style={{ display: "grid", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('currentPassword')}</label>
              <input
                type="password"
                name="currentPassword"
                required
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            <div style={{ display: "grid", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('newPassword')}</label>
              <input
                type="password"
                name="newPassword"
                required
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            <div style={{ display: "grid", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('confirmNewPassword')}</label>
              <input
                type="password"
                name="confirmPassword"
                required
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            <div>
              <button type="submit" className="btn btn-basic">
                {t('updatePassword')}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Display Settings */}
      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          {t('displaySettings')}
        </h2>

        <div className="tile" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              {t('themePreference')}
            </h3>
            <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
              {t('themeNote')}
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button disabled className="btn btn-muted">
                {t('light')}
              </button>
              <button disabled className="btn btn-muted">
                {t('dark')}
              </button>
              <button disabled className="btn btn-muted">
                {t('auto')}
              </button>
            </div>
          </div>
        </div>

        <div className="tile" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            {t('language')}
          </h3>
          <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
            {t('languageNote')}
          </p>
          <form action={updateLanguage} style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "0.4rem" }}>
              <select
                name="locale"
                defaultValue={user.locale}
                style={inputStyle}
              >
                {Object.entries(localeNames).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button type="submit" className="btn btn-basic">
                {t('saveLanguage')}
              </button>
            </div>
          </form>
        </div>
      </section>

    </main>
  );
}
