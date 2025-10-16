// src/app/members/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function MembersPage() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    redirect("/login");
  }
  return (
    <main style={{ padding: 24 }}>
      <h1>Members Area</h1>
      <p>Welcome, {session.user.email}</p>
      <ul>
        <li><a href="/members/profile">Your profile</a></li>
        <li><a href="/members/reading-list">Reading list</a></li>
      </ul>
    </main>
  );
}
