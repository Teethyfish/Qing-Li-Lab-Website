"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword");
  const router = useRouter();
  const [queryReady, setQueryReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    setToken(parameters.get("token"));
    setEmail(parameters.get("email") || "");
    setQueryReady(true);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token && !email.includes("@")) return setError(t("errorInvalidEmail"));
    if (next.length < 8) return setError(t("errorPasswordLength"));
    if (next !== confirm) return setError(t("errorPasswordMismatch"));
    setError(null);
    setStatus("saving");

    const response = token
      ? await fetch("/api/auth/password-reset/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: next }),
        })
      : await fetch("/api/user/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, currentPassword: current, newPassword: next }),
        });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body?.error || t("errorGeneric"));
      setStatus("idle");
      return;
    }

    if (token) {
      setComplete(true);
      setStatus("idle");
      return;
    }

    const signInResult = await signIn("credentials", { email, password: next, redirect: false });
    if (!signInResult?.ok || signInResult.error) {
      router.push("/login");
      return;
    }
    router.push("/members");
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: ".65rem .75rem",
    border: "1px solid color-mix(in oklab, var(--color-text) 18%, transparent)",
    borderRadius: 2,
    background: "var(--color-card)",
    color: "var(--color-text)",
    boxSizing: "border-box",
    font: "inherit",
  };
  if (!queryReady) return <main className="auth-page" />;

  return <main className="auth-page">
    <section className="tile auth-card auth-card-wide">
      <header className="auth-header">
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{token ? t("linkHeading") : t("heading")}</h1>
        <p className="muted" style={{ margin: ".5rem 0 0", lineHeight: 1.55 }}>{complete ? t("success") : token ? t("linkIntro") : t("intro")}</p>
      </header>

      {complete ? <div style={{ display: "grid", gap: "1rem", textAlign: "center" }}>
        <Link className="btn btn-basic" href="/login" style={{ justifyContent: "center" }}>{t("goToLogin")}</Link>
      </div> : <form onSubmit={onSubmit} className="auth-form">
        {!token ? <>
          <label className="auth-field">{t("email")}
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} required autoComplete="email" />
          </label>
          <label className="auth-field">{t("currentPassword")}
            <input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} style={inputStyle} required autoComplete="current-password" />
          </label>
        </> : null}
        <label className="auth-field">{t("newPassword")}
          <input type="password" value={next} onChange={(event) => setNext(event.target.value)} style={inputStyle} required minLength={8} autoComplete="new-password" />
        </label>
        <label className="auth-field">{t("confirmNewPassword")}
          <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} style={inputStyle} required minLength={8} autoComplete="new-password" />
        </label>
        {error ? <p role="alert" className="auth-error">{error}</p> : null}
        <button type="submit" disabled={status === "saving"} className="btn btn-basic auth-submit">
          {status === "saving" ? t("saving") : t("saveNewPassword")}
        </button>
        {token ? <Link href="/forgot-password" style={{ textAlign: "center", fontSize: ".875rem" }}>{t("requestAnother")}</Link> : null}
      </form>}
    </section>
  </main>;
}
