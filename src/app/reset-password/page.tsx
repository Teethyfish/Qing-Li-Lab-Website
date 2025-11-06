"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";


export default function ResetPasswordPage() {
  const t = useTranslations('resetPassword');
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  // Prefill email from ?email=
  useEffect(() => {
    const em = new URLSearchParams(window.location.search).get("email");
    if (em) setEmail(em);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return setError(t('errorInvalidEmail'));
    if (next.length < 8) return setError(t('errorPasswordLength'));
    if (next !== confirm) return setError(t('errorPasswordMismatch'));
    setError(null);
    setStatus("saving");

    // 1) change the password on the server (verifies current temp pw)
    const res = await fetch("/api/user/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, currentPassword: current, newPassword: next }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || t('errorGeneric'));
      setStatus("idle");
      return;
    }

    // 2) auto-login with the NEW password, then send to /members
    const signInRes = await signIn("credentials", {
      email,
      password: next,
      redirect: false,
    });

    if (!signInRes || signInRes.error) {
      // if autologin somehow fails, fall back to login page
      router.push("/login");
      return;
    }

    router.push("/members");
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t('heading')}</h1>
      <p className="text-sm text-gray-600 mb-4">
        {t('intro')}
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">{t('email')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded p-2 outline-none"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">{t('currentPassword')}</span>
          <div className="flex items-center border rounded px-2">
            <input
              type={showCur ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="flex-1 p-2 outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowCur((v) => !v)}
              className="text-xs px-2"
              aria-label="Toggle current password visibility"
            >
              {showCur ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium">{t('newPassword')}</span>
          <div className="flex items-center border rounded px-2">
            <input
              type={showNew ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="flex-1 p-2 outline-none"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="text-xs px-2"
              aria-label="Toggle new password visibility"
            >
              {showCur ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium">{t('confirmNewPassword')}</span>
          <input
            type={showNew ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border rounded p-2 outline-none"
            required
          />
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={status === "saving"}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          {status === "saving" ? t('saving') : t('saveNewPassword')}
        </button>
      </form>
    </main>
  );
}
