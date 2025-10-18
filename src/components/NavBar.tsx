// src/components/NavBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

type Props = {
  isAuthed: boolean;
  isAdmin: boolean;
  email?: string | null;
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
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.5rem",
    fontSize: "0.9rem",
    fontWeight: 500,
    textDecoration: "none",
    transition: "background 120ms ease",
  };

  const active: React.CSSProperties = {
    background: "color-mix(in oklab, var(--color-text) 90%, transparent)",
    color: "white",
  };

  const inactive: React.CSSProperties = {
    color: "var(--color-text)",
  };

  return <Link href={href} style={{ ...base, ...(current ? active : inactive) }}>{label}</Link>;
}

export default function NavBar({ isAuthed, isAdmin, email }: Props) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  // Single list of links. No duplicate “mobile” vs “desktop” rows.
  const items: Array<{ href: string; label: string; show: boolean }> = [
    { href: "/", label: "Home", show: true },
    { href: "/members", label: "Members", show: isAuthed },
    { href: "/members/approval", label: "Approval", show: isAdmin },
    { href: "/members/users", label: "Users", show: isAdmin },
    { href: "/members/theme", label: "Theme", show: isAdmin },
    { href: "/register", label: "Register", show: !isAuthed },
    { href: "/login", label: "Login", show: !isAuthed },
  ];

  const containerStyle: React.CSSProperties = {
    borderBottom: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
    background: "var(--color-bg)",
    position: "sticky",
    top: 0,
    zIndex: 40,
  };

  // Single grid row that naturally wraps the center links on small screens
  const innerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    margin: "0 auto",
    padding: "0.75rem 1rem",
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: "0.75rem",
  };

  const brandStyle: React.CSSProperties = {
    fontWeight: 600,
    textDecoration: "none",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
  };

  const linksRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap", // wraps on narrow screens so we never need a second bar
  };

  const rightRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    justifyContent: "flex-end",
  };

  const emailStyle: React.CSSProperties = {
    color: "var(--color-muted)",
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "38ch",
  };

  const logoutBtn: React.CSSProperties = {
    padding: "0.45rem 0.8rem",
    borderRadius: "0.5rem",
    background: "color-mix(in oklab, var(--color-text) 90%, transparent)",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
  };

  const loginLink: React.CSSProperties = {
    padding: "0.45rem 0.8rem",
    borderRadius: "0.5rem",
    background: "var(--color-primary)",
    color: "white",
    textDecoration: "none",
    fontSize: "0.9rem",
  };

  return (
    <nav style={containerStyle}>
      <div style={innerStyle}>
        {/* Brand */}
        <Link href="/" style={brandStyle}>Qing Li Lab</Link>

        {/* Single links row (center column) */}
        <div style={linksRow}>
          {items
            .filter((i) => i.show)
            .map((i) => (
              <NavItem
                key={i.href}
                href={i.href}
                label={i.label}
                current={
                  pathname === i.href ||
                  (i.href !== "/" && (pathname || "").startsWith(i.href))
                }
              />
            ))}
        </div>

        {/* Right side: email + logout / login */}
        <div style={rightRow}>
          {isAuthed ? (
            <>
              {email && <span style={emailStyle} title={email}>{email}</span>}
              <button
                onClick={async () => {
                  setBusy(true);
                  await signOut({ callbackUrl: "/" });
                  setBusy(false);
                }}
                disabled={busy}
                style={logoutBtn}
              >
                {busy ? "Signing out…" : "Logout"}
              </button>
            </>
          ) : (
            <Link href="/login" style={loginLink}>Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
