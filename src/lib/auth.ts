// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = (creds?.email || "").toLowerCase().trim();
        const password = creds?.password || "";

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
            mustResetPassword: true, // <-- boolean column in User
          },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Attach minimal user payload. We'll mirror mustResetPassword to the JWT.
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          needsPwReset: !!user.mustResetPassword,
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, copy flags from user
      if (user) {
        token.email = user.email;
        (token as any).role = (user as any).role;
        (token as any).needsPwReset = Boolean((user as any).needsPwReset);
        return token;
      }

      // On subsequent requests, refresh needsPwReset from DB (cheap, keeps middleware accurate)
      if (token?.email) {
        const db = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
          select: { mustResetPassword: true, role: true },
        });
        if (db) {
          (token as any).needsPwReset = Boolean(db.mustResetPassword);
          (token as any).role = db.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Expose the flags/role to the client when needed
      if (session.user) {
        (session.user as any).role = (token as any)?.role ?? "MEMBER";
        (session as any).needsPwReset = Boolean((token as any)?.needsPwReset);
      }
      return session;
    },
  },
};
