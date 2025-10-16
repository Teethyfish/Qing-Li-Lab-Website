// src/app/members/profile/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import ProfileForm from "../../../components/ProfileForm";

const prisma = new PrismaClient();

export default async function ProfilePage() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { email: true, name: true, about: true },
  });

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>Edit your profile</h1>
      <p><b>Email:</b> {user?.email}</p>
      <ProfileForm defaultName={user?.name ?? ""} defaultAbout={user?.about ?? ""} />
    </main>
  );
}
