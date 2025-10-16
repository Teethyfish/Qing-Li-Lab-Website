"use client";

import { useState } from "react";

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const cleanedSlug = toSlug(slug);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, slug: cleanedSlug, note }),
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
      <main style={{ padding: 24 }}>
        <h1>Registration submitted!</h1>
        <p>Thank you, {name}. Your request has been sent for approval.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>Lab Registration</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Full name
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Desired profile URL (slug)
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. lynn-zhang"
            style={{ width: "100%" }}
          />
          <small>Will be saved as: <b>{toSlug(slug) || "(invalid)"}</b></small>
        </label>

        <label>
          Note to PI (optional)
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Submitting..." : "Submit"}
        </button>

        {status === "error" && <p style={{ color: "crimson" }}>{error}</p>}
      </form>
    </main>
  );
}
