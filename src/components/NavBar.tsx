"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useEditMode } from "@/contexts/EditModeContext";

function initials(name?: string | null) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "??";
}

type Props = {
  isAuthed: boolean;
  isAdmin: boolean;
  userSlug?: string | null;
  userImageUrl?: string | null;
  userName?: string | null;
};

function NavItem({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      className="nav-item"
      style={{
        textDecoration: "none",
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        transition: "background .15s ease",
        color: current ? "var(--color-bg, #ffffff)" : "var(--nav-text, var(--color-text, #111827))",
        background: current ? "var(--nav-text, var(--color-text, #111827))" : "transparent",
      }}
    >
      {label}
    </Link>
  );
}

export default function NavBar({ isAuthed, isAdmin, userSlug, userImageUrl, userName }: Props) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const { isEditMode, setIsEditMode } = useEditMode();

  const items: Array<{ href: string; label: string; show: boolean }> = [
    { href: "/", label: t('home'), show: true },
    { href: "/members", label: t('members'), show: isAuthed },
    { href: "/register", label: t('register'), show: !isAuthed },
    { href: "/login", label: t('login'), show: !isAuthed },
  ];

  const adminItems: Array<{ href: string; label: string }> = [
    { href: "/members/approval", label: t('approval') },
    { href: "/members/users", label: t('users') },
    { href: "/members/announcements", label: t('announcements') },
    { href: "/members/theme", label: t('theme') },
  ];

  const isCurrent = (href: string) => pathname === href;

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: `saturate(1.2) blur(calc(var(--nav-blur, 6) * 1px))`,
        background: "color-mix(in oklab, var(--nav-bg, #ffffff) calc(var(--nav-opacity, 90) * 1%), transparent)",
        borderBottom: "1px solid var(--nav-border, #e5e7eb)",
        width: "100vw",
      }}
      aria-label="Primary"
    >
      <div
        style={{
          margin: "0 auto",
          padding: "0 max(24px, calc((100vw - 1280px) / 2 + 12px))",
          maxWidth: "100%",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: `calc(var(--nav-height, 56) * 1px)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          {/* Left: links */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {items
              .filter((i) => i.show)
              .map((i) => (
                <NavItem
                  key={i.href}
                  href={i.href}
                  label={i.label}
                  current={isCurrent(i.href)}
                />
              ))}

            {/* Admin Only dropdown */}
            {isAdmin && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                  className="btn btn-warning"
                  style={{
                    fontSize: 14,
                  }}
                >
                  {t('adminOnly')}
                </button>

                {adminDropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      onClick={() => setAdminDropdownOpen(false)}
                      style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 40,
                      }}
                    />
                    {/* Dropdown content */}
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        zIndex: 50,
                        minWidth: 160,
                        background: "var(--color-card, #ffffff)",
                        border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px color-mix(in oklab, var(--color-text) 15%, transparent)",
                        overflow: "hidden",
                      }}
                    >
                      {adminItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setAdminDropdownOpen(false)}
                          style={{
                            display: "block",
                            padding: "0.75rem 1rem",
                            textDecoration: "none",
                            color: "var(--color-text)",
                            fontSize: "0.9rem",
                            borderBottom: "1px solid color-mix(in oklab, var(--color-text) 8%, transparent)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "color-mix(in oklab, var(--color-text) 6%, transparent)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: edit mode + user + logout/login */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Edit Mode Toggle (Admin/PI only) */}
            {isAdmin && (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="btn btn-basic"
                style={{
                  fontSize: 14,
                  background: isEditMode ? "var(--btn-warning-bg, #f59e0b)" : undefined,
                  borderColor: isEditMode ? "var(--btn-warning-bg, #f59e0b)" : undefined,
                }}
              >
                {isEditMode ? "Exit Edit Mode" : "Edit Page"}
              </button>
            )}

            {isAuthed ? (
              <>
                {/* Profile picture with dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "9999px",
                      overflow: "hidden",
                      border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "color-mix(in oklab, var(--color-text) 6%, #f3f4f6)",
                      color: "var(--color-text)",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {userImageUrl ? (
                      <Image
                        src={userImageUrl}
                        alt={userName || "User"}
                        width={36}
                        height={36}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      initials(userName)
                    )}
                  </button>

                  {/* Dropdown menu */}
                  {profileDropdownOpen && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div
                        onClick={() => setProfileDropdownOpen(false)}
                        style={{
                          position: "fixed",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 40,
                        }}
                      />
                      {/* Dropdown content */}
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          right: 0,
                          zIndex: 50,
                          minWidth: 180,
                          background: "var(--color-card, #ffffff)",
                          border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px color-mix(in oklab, var(--color-text) 15%, transparent)",
                          overflow: "hidden",
                        }}
                      >
                        <Link
                          href={userSlug ? `/people/${userSlug}` : "/members"}
                          onClick={() => setProfileDropdownOpen(false)}
                          style={{
                            display: "block",
                            padding: "0.75rem 1rem",
                            textDecoration: "none",
                            color: "var(--color-text)",
                            fontSize: "0.9rem",
                            borderBottom: "1px solid color-mix(in oklab, var(--color-text) 8%, transparent)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "color-mix(in oklab, var(--color-text) 6%, transparent)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {t('viewProfile')}
                        </Link>
                        <Link
                          href="/members/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          style={{
                            display: "block",
                            padding: "0.75rem 1rem",
                            textDecoration: "none",
                            color: "var(--color-text)",
                            fontSize: "0.9rem",
                            borderBottom: "1px solid color-mix(in oklab, var(--color-text) 8%, transparent)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "color-mix(in oklab, var(--color-text) 6%, transparent)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {t('editProfile')}
                        </Link>
                        <Link
                          href="/members/settings"
                          onClick={() => setProfileDropdownOpen(false)}
                          style={{
                            display: "block",
                            padding: "0.75rem 1rem",
                            textDecoration: "none",
                            color: "var(--color-muted)",
                            fontSize: "0.9rem",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "color-mix(in oklab, var(--color-text) 6%, transparent)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {t('settings')}
                        </Link>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={async () => {
                    setBusy(true);
                    await signOut({ callbackUrl: "/" });
                    setBusy(false);
                  }}
                  disabled={busy}
                  className="btn btn-basic"
                >
                  {busy ? t('signingOut') : t('logout')}
                </button>
              </>
            ) : (
              <Link href="/login" className="btn btn-basic">
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
