"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

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
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  const items: Array<{ href: string; label: string; show: boolean }> = [
    { href: "/", label: "Home", show: true },
    { href: "/members", label: "Members", show: isAuthed },
    { href: userSlug ? `/people/${userSlug}` : "/members/profile", label: "Profile", show: isAuthed },
    { href: "/members/approval", label: "Approval", show: isAdmin },
    { href: "/members/users", label: "Users", show: isAdmin },
    { href: "/members/theme", label: "Theme", show: isAdmin },
    { href: "/register", label: "Register", show: !isAuthed },
    { href: "/login", label: "Login", show: !isAuthed },
  ];

  const isCurrent = (href: string) => pathname === href;

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: `saturate(1.2) blur(calc(var(--nav-blur, 6) * 1px))`,
        background: "color-mix(in oklab, var(--nav-bg, #ffffff) calc(var(--nav-opacity, 90) * 1%), transparent)",
        borderBottom: "1px solid var(--nav-border, #e5e7eb)",
      }}
      aria-label="Primary"
    >
      <div
        style={{
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            height: `calc(var(--nav-height, 56) * 1px)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Left: brand + links */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/"
              style={{
                fontWeight: 600,
                textDecoration: "none",
                color: "var(--nav-text, var(--color-text, #111827))",
                marginRight: 4,
              }}
            >
              Qing Li Lab
            </Link>

            {/* links row (always visible; we already fixed the double-navbar issue) */}
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
            </div>
          </div>

          {/* Right: user + logout/login */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAuthed ? (
              <>
                {/* Profile picture */}
                <div
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
                  {busy ? "Signing out…" : "Logout"}
                </button>
              </>
            ) : (
              <Link href="/login" className="btn btn-basic">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
