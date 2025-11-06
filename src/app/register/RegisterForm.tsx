// src/app/register/RegisterForm.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function RegisterForm() {
  const t = useTranslations('auth');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const cleanedSlug = useMemo(() => toSlug(slug), [slug]);
  const slugLooksValid = cleanedSlug.length >= 2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slugLooksValid) return;

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          slug: cleanedSlug,
          note: note.trim(),
        }),
      });

      if (!res.ok) {
        let msg = `Failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }

      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Failed to send request");
    }
  }

  if (status === "done") {
    return (
      <main className="mx-auto max-w-lg" style={{ paddingTop: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            {t('registrationSubmitted')}
          </h1>
          <p className="muted">
            {t('thankYou', { name })}
          </p>
        </div>

        <div className="tile" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
          <p className="muted" style={{ fontSize: "0.875rem" }}>
            {t('approvalNote')}
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href="/" className="btn btn-basic">
              {t('backToHome')}
            </Link>
            <Link href="/login" className="btn btn-muted">
              {t('goToLogin')}
            </Link>
          </div>
        </div>
      </main>
    );
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
    <main className="mx-auto max-w-lg" style={{ paddingTop: "2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>
          {t('register')}
        </h1>
        <p className="muted">{t('registerSubtitle')}</p>
      </div>

      <div className="tile" style={{ padding: "1.5rem" }}>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem" }}>
          {/* Full name */}
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('fullName')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="e.g., Lynn Zhang"
            />
          </div>

          {/* Email */}
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="name@hawaii.edu"
            />
            <p className="muted" style={{ fontSize: "0.75rem" }}>
              {t('emailNote')}
            </p>
          </div>

          {/* Slug */}
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('desiredSlug')}</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              style={inputStyle}
              placeholder="e.g., lynn-zhang"
            />
            <div className="muted" style={{ fontSize: "0.75rem" }}>
              {t('slugPreview')}&nbsp;
              <code
                style={{
                  padding: "0.125rem 0.25rem",
                  borderRadius: "4px",
                  background: "color-mix(in oklab, var(--color-text) 8%, transparent)",
                  fontFamily: "monospace",
                }}
              >
                {cleanedSlug || t('slugInvalid')}
              </code>
            </div>
          </div>

          {/* Note to PI */}
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t('noteToPI')}</label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={inputStyle}
              placeholder="Share your interests or why you're joining…"
            />
          </div>

          {/* Error */}
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

          {/* Submit */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={status === "sending" || !slugLooksValid}
              className="btn btn-basic"
            >
              {status === "sending" ? t('submitting') : t('submit')}
            </button>
            {!slugLooksValid && (
              <span className="muted" style={{ fontSize: "0.75rem" }}>
                {t('slugRequirement')}
              </span>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
