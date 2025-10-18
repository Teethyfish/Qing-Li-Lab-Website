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
    background:
      "color-mix(in oklab, var(--color-text) 90%, transparent)", // dark bg
    color: "white",
  };

  const inactive: React.CSSProperties = {
    color: "var(--color-text)",
  };

  return (
    <Link
      href={href}
      style={{ ...base, ...(current ? active : inactive) }}
      onMouseEnter={(e) => {
        if (!current) {
          (e.currentTarget as HTMLAnchorElement).style.background =
            "color-mix(in oklab, var(--color-text) 10%, transparent)";
        }
      }}
      onMouseLeave={(e) => {
        if (!current) {
          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
        }
      }}
    >
      {label}
    </Link>
  );
}

export default function NavBar({ isAuthed, isAdmin, email }: Props) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

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
    borderBottom:
      "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
    background: "var(--color-bg)",
    position: "sticky",
    top: 0,
    zIndex: 40,
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: "80rem",
    margin: "0 auto",
    padding: "0.75rem 1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
  };

  const brandStyle: React.CSSProperties = {
    fontWeight: 600,
    textDecoration: "none",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
  };

  const logoutBtn: React.CSSProperties = {
    padding: "0.45rem 0.8rem",
    borderRadius: "0.5rem",
    background:
      "color-mix(in oklab, var(--color-text) 90%, transparent)", // dark
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
      <div style={innerStyle} className="nav-inner">
        {/* left: brand + desktop links */}
        <div style={rowStyle}>
          <Link href="/" style={brandStyle}>
            Qing Li Lab
          </Link>

          <div className="nav-desktop" style={{ ...rowStyle, marginLeft: "0.5rem" }}>
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
        </div>

        {/* right: email + auth button */}
        <div style={rowStyle}>
          {isAuthed ? (
            <>
              {email && (
                <span
                  style={{
                    color: "var(--color-muted)",
                    fontSize: "0.85rem",
                    display: "none",
                  }}
                  className="email-desktop"
                >
                  {email}
                </span>
              )}
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
            <Link href="/login" style={loginLink}>
              Login
            </Link>
          )}
        </div>
      </div>

      {/* mobile row */}
      <div className="nav-mobile" style={{ borderTop: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)" }}>
        <div style={{ ...rowStyle, padding: "0.5rem" }}>
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
      </div>

      {/* simple breakpoint rules */}
      <style jsx>{`
        /* hide mobile links on >=640px, show email on >=640px */
        @media (min-width: 640px) {
          .nav-mobile {
            display: none;
          }
          .email-desktop {
            display: inline;
          }
        }
        /* show desktop links only on >=640px */
        @media (max-width: 639px) {
          .nav-desktop {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
