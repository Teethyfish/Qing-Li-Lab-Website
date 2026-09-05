// src/app/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.ok && !result.error) {
      router.push("/members");
      router.refresh();
      return;
    }
    setStatus("error");
    setError(t('errorInvalidCredentials') || "Incorrect email or password.");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.7rem",
    borderRadius: 2,
    border: "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
    background: "var(--color-card)",
    boxSizing: "border-box",
  };

  return (
    <main className="auth-page">
      <section className="tile auth-card">
      <div className="auth-header">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>{t('login')}</h1>
        <p className="muted">{t('loginSubtitle')}</p>
      </div>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="auth-field">
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@hawaii.edu"
            />
          </div>

          <div className="auth-field">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem" }}>
              <label htmlFor="login-password" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('password')}</label>
              <Link href="/forgot-password" style={{ fontSize: "0.82rem", fontWeight: 600 }}>{t('forgotPassword')}</Link>
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {status === "error" && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <div className="auth-actions">
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn btn-basic auth-submit"
            >
              {status === "loading" ? t('signingIn') : t('signIn')}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
