// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

/** Case-insensitive lookup of most recent TEMP_PW for this email */
async function getLatestTempPw(email: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ note: string }[]>`
    SELECT "note"
    FROM "PendingInvite"
    WHERE LOWER("email") = LOWER(${email})
      AND "note" ILIKE '%TEMP_PW:%'
    ORDER BY COALESCE("decidedAt","requestedAt") DESC
    LIMIT 1
  `;
  const note = rows?.[0]?.note ?? "";
  const m = note.match(/TEMP_PW:\s*([^\s|]+)/i);
  return m?.[1] ?? null;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email || "").trim();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
          },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const latestTemp = await getLatestTempPw(email);
        const needsPwReset = !!latestTemp && latestTemp === password;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          needsPwReset,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.needsPwReset = !!user.needsPwReset;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: any) {
      (session.user as any).role = token.role;
      (session.user as any).needsPwReset = !!token.needsPwReset;
      return session;
    },
  },
};
