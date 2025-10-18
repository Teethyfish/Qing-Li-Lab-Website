// src/app/register/RegisterForm.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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
      <main className="max-w-lg space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Registration submitted!</h1>
          <p className="text-gray-600">
            Thank you, {name}. Your request has been sent to the PI for approval.
          </p>
        </header>

        <section className="rounded border bg-white p-6 shadow-sm space-y-3">
          <p className="text-sm text-gray-600">
            You’ll receive an email with a temporary password once approved.
          </p>
          <div className="flex gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Back to Home
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded border px-4 py-2 hover:bg-gray-50"
            >
              Go to Login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Lab Registration</h1>
        <p className="text-gray-600">Request an account to access the members area.</p>
      </header>

      <section className="rounded border bg-white p-6 shadow-sm">
        <form onSubmit={onSubmit} className="grid gap-4">
          {/* Full name */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border p-2 outline-none focus:ring focus:ring-blue-200"
              placeholder="e.g., Lynn Zhang"
            />
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border p-2 outline-none focus:ring focus:ring-blue-200"
              placeholder="name@hawaii.edu"
            />
            <p className="text-xs text-gray-500">
              Use an email you can access; approval details will be sent there.
            </p>
          </div>

          {/* Slug */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Desired profile URL (slug)</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded border p-2 outline-none focus:ring focus:ring-blue-200"
              placeholder="e.g., lynn-zhang"
            />
            <div className="text-xs text-gray-500">
              Preview:&nbsp;
              <code className="rounded bg-gray-100 px-1 py-0.5">
                {cleanedSlug || "(invalid)"}
              </code>
            </div>
          </div>

          {/* Note to PI */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Note to PI (optional)</label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded border p-2 outline-none focus:ring focus:ring-blue-200"
              placeholder="Share your interests or why you’re joining…"
            />
          </div>

          {/* Error */}
          {status === "error" && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={status === "sending" || !slugLooksValid}
              className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "sending" ? "Submitting…" : "Submit"}
            </button>
            {!slugLooksValid && (
              <span className="text-xs text-gray-500">
                Slug must be at least 2 characters (letters/numbers/dashes).
              </span>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
