import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // --- normalize inputs
        const rawEmail = (credentials?.email ?? "").toString().trim();
        const rawPassword = (credentials?.password ?? "").toString();

        if (!rawEmail || !rawPassword) {
          throw new Error("Missing credentials");
        }

        // --- case-insensitive email lookup
        const user = await prisma.user.findFirst({
          where: {
            email: {
              equals: rawEmail,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
          },
        });

        if (!user) {
          throw new Error("No user found with that email");
        }

        const storedHash = user.passwordHash ?? "";
        if (!storedHash) {
          throw new Error("No password set for this account");
        }

        const ok = await bcrypt.compare(rawPassword, storedHash);
        if (!ok) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).role = (user as any).role;
      if (!(token as any).role && token.email) {
        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: token.email as string, mode: "insensitive" } },
          select: { role: true },
        });
        (token as any).role = dbUser?.role || "MEMBER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = (token as any).role || "MEMBER";
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
