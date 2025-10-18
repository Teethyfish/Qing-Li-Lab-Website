// src/app/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
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
    setError("Incorrect email or password.");
  }

  return (
    <main className="max-w-md space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-gray-600">Members sign in below.</p>
      </header>

      <section className="rounded border bg-white p-6 shadow-sm">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border p-2 outline-none focus:ring focus:ring-blue-200"
              placeholder="you@hawaii.edu"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border p-2 outline-none focus:ring focus:ring-blue-200"
              placeholder="••••••••"
            />
          </div>

          {status === "error" && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
