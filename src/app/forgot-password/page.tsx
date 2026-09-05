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

  return <main style={{ minHeight: "calc(100vh - 7rem)", display: "grid", placeItems: "center", padding: "2rem 1rem", boxSizing: "border-box" }}>
    <section className="tile" style={{ width: "100%", maxWidth: 440, padding: "2rem", boxSizing: "border-box" }}>
      <header style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{t("heading")}</h1>
        <p className="muted" style={{ margin: ".5rem 0 0", lineHeight: 1.55 }}>{complete ? t("sent") : t("intro")}</p>
      </header>
      {complete ? <div style={{ display: "grid", gap: "1rem", textAlign: "center" }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{t("checkEmail")}</p>
        <Link className="btn btn-basic" href="/login" style={{ justifyContent: "center" }}>{t("backToLogin")}</Link>
      </div> : <form onSubmit={submit} style={{ display: "grid", gap: "1rem" }}>
        <label style={{ display: "grid", gap: ".4rem", fontSize: ".875rem", fontWeight: 600 }}>
          {t("email")}
          <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} placeholder="you@hawaii.edu" />
        </label>
        {error ? <p role="alert" style={{ margin: 0, color: "#b91c1c", fontSize: ".875rem" }}>{error}</p> : null}
        <button type="submit" className="btn btn-basic" disabled={busy} style={{ justifyContent: "center" }}>{busy ? t("sending") : t("send")}</button>
        <Link href="/login" style={{ textAlign: "center", fontSize: ".875rem" }}>{t("backToLogin")}</Link>
      </form>}
    </section>
  </main>;
}
