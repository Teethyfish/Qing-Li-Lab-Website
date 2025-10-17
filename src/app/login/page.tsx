"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    // 1) sign in WITHOUT automatic redirect
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!res || res.error) {
      setStatus("idle");
      setError("Invalid email or password.");
      return;
    }

    // 2) fetch the session to inspect the reset flag set in NextAuth callbacks
    const sessRes = await fetch("/api/auth/session");
    const sess = await sessRes.json().catch(() => ({}));
    const needs = !!sess?.user?.needsPwReset;

    // 3) route based on the flag
    if (needs) {
      const url = new URL("/reset-password", window.location.origin);
      url.searchParams.set("email", email);
      router.push(url.toString());
    } else {
      router.push("/members"); // your normal post-login page
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded p-2 outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded p-2 outline-none"
          />
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          {status === "loading" ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
