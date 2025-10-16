"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    // Read actual values that the browser (or autofill) put in the DOM
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "").trim();

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false, // we'll control navigation
    });

    setLoading(false);

    if (!res || res.error) {
      setErr("Incorrect email or password.");
      return;
    }
    router.push("/members");
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Lab Login</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input
            name="email"                // IMPORTANT for FormData + autofill
            type="email"
            inputMode="email"
            autoComplete="username"     // help autofill target the right field
            autoCapitalize="none"
            spellCheck={false}
            style={{ width: "100%" }}
            // leave this UNCONTROLLED (no value/onChange)
          />
        </label>

        <label>
          Password
          <input
            name="password"             // IMPORTANT for FormData + autofill
            type="password"
            autoComplete="current-password"
            style={{ width: "100%" }}
            // leave this UNCONTROLLED
          />
        </label>

        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
