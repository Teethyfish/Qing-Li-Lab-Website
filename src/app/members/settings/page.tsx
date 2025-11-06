// src/app/members/settings/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, name: true },
  });

  if (!user) redirect("/login");

  // Server action to change password
  async function changePassword(formData: FormData) {
    "use server";
    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    // TODO: Implement password change logic
    // 1. Verify current password
    // 2. Validate new password matches confirm
    // 3. Hash and update password

    console.log("Password change requested (not yet implemented)");
    revalidatePath("/members/settings");
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
          Settings
        </h1>
        <p className="muted">Manage your account, display, and notification preferences</p>
      </header>

      {/* Account Settings */}
      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          Account Settings
        </h2>

        <div className="tile" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Email
          </h3>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {user.email}
          </div>
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
            Contact an admin to change your email address
          </p>
        </div>

        <div className="tile" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
            Change Password
          </h3>
          <form action={changePassword} style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                required
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            <div style={{ display: "grid", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>New Password</label>
              <input
                type="password"
                name="newPassword"
                required
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            <div style={{ display: "grid", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Confirm New Password</label>
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
                Update Password
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Display Settings */}
      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          Display Settings
        </h2>

        <div className="tile" style={{ padding: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Theme Preference
              </h3>
              <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                Coming soon: Choose your preferred color scheme
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button disabled className="btn btn-muted">
                  Light
                </button>
                <button disabled className="btn btn-muted">
                  Dark
                </button>
                <button disabled className="btn btn-muted">
                  Auto
                </button>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Language
              </h3>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Coming soon: Select your preferred language
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Notification Settings */}
      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          Notification Settings
        </h2>

        <div className="tile" style={{ padding: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1.5rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Email Notifications
              </h3>
              <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                Choose which emails you'd like to receive
              </p>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" disabled style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: "0.9rem" }}>New member registrations (Admins only)</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" disabled style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: "0.9rem" }}>Account updates and announcements</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" disabled style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: "0.9rem" }}>Weekly lab activity summary</span>
                </label>
              </div>
            </div>

            <div>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Notification preferences will be available soon
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
