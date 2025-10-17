"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export default function AuthButtons({ isAuthed }: { isAuthed: boolean }) {
  if (!isAuthed) {
    return (
      <Link
        href="/login"
        className="inline-block px-4 py-2 rounded bg-blue-600 text-white"
      >
        Login
      </Link>
    );
  }
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="px-4 py-2 rounded bg-gray-700 text-white"
    >
      Logout
    </button>
  );
}
