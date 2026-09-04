// src/app/login/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email && (session.user as any).isActive !== false) {
    // already logged in → send to members
    redirect("/members");
  }
  return <LoginForm />;
}
