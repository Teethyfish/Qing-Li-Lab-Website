// src/app/members/layout.tsx
"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontFamily: "sans-serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          background: "#f4f4f4",
          padding: "12px 24px",
          borderBottom: "1px solid #ccc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <nav style={{ display: "flex", gap: 12 }}>
          <Link href="/members">Home</Link>
          <Link href="/members/profile">Profile</Link>
        </nav>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{
            padding: "6px 12px",
            background: "#e33",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>

      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
