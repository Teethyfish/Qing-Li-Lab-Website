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
  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-md text-sm font-medium transition",
        current ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
      ].join(" ")}
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
    { href: "/register", label: "Register", show: !isAuthed },
    { href: "/login", label: "Login", show: !isAuthed },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Left: brand + main links */}
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold">
              Qing Li Lab
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {items
                .filter((i) => i.show)
                .map((i) => (
                  <NavItem
                    key={i.href}
                    href={i.href}
                    label={i.label}
                    current={
                      pathname === i.href ||
                      (i.href !== "/" && pathname?.startsWith(i.href))
                    }
                  />
                ))}
            </div>
          </div>

          {/* Right: user + logout */}
          <div className="flex items-center gap-2">
            {isAuthed ? (
              <>
                {email && (
                  <span className="hidden sm:inline text-sm text-gray-600">
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
                  className="px-3 py-1.5 rounded-md bg-gray-800 text-white text-sm"
                >
                  {busy ? "Signing out…" : "Logout"}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* small-screen links */}
      <div className="sm:hidden border-t">
        <div className="flex flex-wrap gap-1 px-2 py-2">
          {items
            .filter((i) => i.show)
            .map((i) => (
              <NavItem
                key={i.href}
                href={i.href}
                label={i.label}
                current={
                  pathname === i.href ||
                  (i.href !== "/" && pathname?.startsWith(i.href))
                }
              />
            ))}
        </div>
      </div>
    </nav>
  );
}
