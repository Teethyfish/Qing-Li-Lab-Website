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
    <main style={{ minHeight: "calc(100vh - 7rem)", display: "grid", placeItems: "center", padding: "2rem 1rem", boxSizing: "border-box" }}>
      <section className="tile" style={{ width: "100%", maxWidth: 440, padding: "2rem", boxSizing: "border-box" }}>
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>{t('login')}</h1>
        <p className="muted">{t('loginSubtitle')}</p>
      </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.4rem" }}>
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

          <div style={{ display: "grid", gap: "0.4rem" }}>
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
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "2px",
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ paddingTop: "0.5rem", display: "grid" }}>
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn btn-basic"
              style={{ justifyContent: "center" }}
            >
              {status === "loading" ? t('signingIn') : t('signIn')}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
