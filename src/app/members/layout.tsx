// src/app/members/layout.tsx
"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

// src/app/members/layout.tsx
export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No local nav here — the global NavBar handles navigation & logout
  return <>{children}</>;
}
