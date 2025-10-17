import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import NavBar from "../components/NavBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Qing Li Lab — Internal",
  description: "Lab website internal tools",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;
  const email = user?.email || null;
  const role = (user?.role || "").toString().toUpperCase();
  const isAuthed = !!email;
  const isAdmin = role === "ADMIN";

  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <NavBar isAuthed={isAuthed} isAdmin={isAdmin} email={email} />
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
