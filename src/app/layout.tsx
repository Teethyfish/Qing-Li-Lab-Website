// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "../components/NavBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTheme, themeToCss } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Qing Li Lab — Internal",
  description: "Lab website",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // session is optional here; remove if you don't need it
  await getServerSession(authOptions); // keep if your NavBar checks cookies/session internally

  // Load theme from DB and inject as CSS variables
  const theme = await getTheme();
  const cssVars = themeToCss(theme);

  return (
    <html lang="en">
      <body
        className="min-h-screen antialiased"
        style={{
          background: "var(--color-bg)",
          color: "var(--color-text)",
          fontFamily: "var(--font-family)",
          fontSize: "var(--font-size)",
        }}
      >
        {/* Inject CSS variables for the whole site */}
        <style id="theme">{cssVars}</style>

        {/* Global nav (no props required) */}
        <NavBar />

        {/* Page content */}
        <div className="mx-auto max-w-5xl p-6">{children}</div>
      </body>
    </html>
  );
}
