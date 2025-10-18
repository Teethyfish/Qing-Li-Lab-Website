// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "../components/NavBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTheme, themeToCss } from "@/lib/theme";
// src/app/layout.tsx
export const viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "Qing Li Lab — Internal",
  description: "Lab website",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get session to derive navbar props
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const role = (session?.user as any)?.role ?? null;
  const isAuthed = !!email;
  const isAdmin = typeof role === "string" && role.toUpperCase() === "ADMIN";

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

        {/* Global nav expects props */}
        <NavBar isAuthed={isAuthed} isAdmin={isAdmin} />

        {/* Page content */}
        <div className="mx-auto max-w-5xl p-6">{children}</div>
      </body>
    </html>
  );
}
