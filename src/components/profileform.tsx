"use client";

import { useState } from "react";

export default function ProfileForm(props: { defaultName?: string; defaultAbout?: string }) {
  const [name, setName] = useState(props.defaultName ?? "");
  const [about, setAbout] = useState(props.defaultAbout ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // TEMP: include your email just for this test; we'll remove this once auth is re-enabled.
        body: JSON.stringify({
          email: "hoilamz@hawaii.edu", // 👈 change to your seeded admin email
          name,
          about,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Save failed (${res.status})`);
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Something went wrong");
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label>
        Display name
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: "100%" }}
        />
      </label>

      <label>
        About me
        <textarea
          rows={8}
          value={about}
          onChange={e => setAbout(e.target.value)}
          style={{ width: "100%" }}
        />
      </label>

      <button type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving..." : "Save"}
      </button>

      {status === "saved" && <p style={{ color: "green" }}>Saved!</p>}
      {status === "error" && <p style={{ color: "crimson" }}>{error}</p>}
    </form>
  );
}
