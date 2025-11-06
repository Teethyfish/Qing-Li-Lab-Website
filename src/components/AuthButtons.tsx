"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function AuthButtons({ isAuthed }: { isAuthed: boolean }) {
  const t = useTranslations("auth");
  if (!isAuthed) {
    return (
      <Link
        href="/login"
        className="inline-block px-4 py-2 rounded bg-blue-600 text-white"
      >
        {t("login")}
      </Link>
    );
  }
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="px-4 py-2 rounded bg-gray-700 text-white"
    >
      {t("logout")}
    </button>
  );
}
