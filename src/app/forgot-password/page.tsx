"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgotPassword");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || t("sendError"));
      setComplete(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("sendError"));
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.75rem",
    border: "1px solid color-mix(in oklab, var(--color-text) 18%, transparent)",
    borderRadius: 2,
    background: "var(--color-card)",
    color: "var(--color-text)",
    boxSizing: "border-box",
    font: "inherit",
  };

  return <main className="auth-page">
    <section className="tile auth-card">
      <header className="auth-header">
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{t("heading")}</h1>
        <p className="muted" style={{ margin: ".5rem 0 0", lineHeight: 1.55 }}>{complete ? t("sent") : t("intro")}</p>
      </header>
      {complete ? <div style={{ display: "grid", gap: "1rem", textAlign: "center" }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{t("checkEmail")}</p>
        <Link className="btn btn-basic" href="/login" style={{ justifyContent: "center" }}>{t("backToLogin")}</Link>
      </div> : <form onSubmit={submit} className="auth-form">
        <label className="auth-field">
          {t("email")}
          <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} placeholder="you@hawaii.edu" />
        </label>
        {error ? <p role="alert" className="auth-error">{error}</p> : null}
        <button type="submit" className="btn btn-basic auth-submit" disabled={busy}>{busy ? t("sending") : t("send")}</button>
        <Link href="/login" style={{ textAlign: "center", fontSize: ".875rem" }}>{t("backToLogin")}</Link>
      </form>}
    </section>
  </main>;
}
