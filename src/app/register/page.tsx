// src/app/register/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const session = await getServerSession();
  // If already logged in, don't show the registration form.
  if (session?.user?.email) {
    redirect("/members");
  }
  return <RegisterForm />;
}
