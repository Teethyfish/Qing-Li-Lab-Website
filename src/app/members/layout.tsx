// src/app/members/layout.tsx
import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export default async function MembersLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  // Must be logged in
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    redirect("/login");
    return null;
  }

  // Enforce password reset before accessing ANY /members page
  const me = await prisma.user.findUnique({
    where: { email },
    select: { mustResetPassword: true },
  });

  if (me?.mustResetPassword) {
    redirect("/reset-password");
    return null;
  }

  // Render members area normally
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
