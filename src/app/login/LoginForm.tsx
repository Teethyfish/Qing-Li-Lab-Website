// src/app/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function LoginForm() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: true,
      callbackUrl: "/members",
    });

    // signIn() redirects on success; if it returns, it likely failed:
    setStatus("error");
    setError(t('errorInvalidCredentials') || "Incorrect email or password.");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.7rem",
    borderRadius: 10,
    border: "1px solid color-mix(in oklab, var(--color-text) 15%, transparent)",
    background: "var(--color-card)",
    boxSizing: "border-box",
  };

  return (
    <main className="mx-auto max-w-md" style={{ paddingTop: "2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>{t('login')}</h1>
        <p className="muted">{t('loginSubtitle')}</p>
      </div>

      <div className="tile" style={{ padding: "1.5rem" }}>
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
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('password')}</label>
            <input
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
                borderRadius: "8px",
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ paddingTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn btn-basic"
            >
              {status === "loading" ? t('signingIn') : t('signIn')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
