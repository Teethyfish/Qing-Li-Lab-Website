import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  const email = (session?.user as any)?.email as string | undefined;

  if (!email) redirect("/login");

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Members Area</h1>
        <p className="text-gray-600">Welcome, {email}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/members/profile"
          className="rounded border p-4 hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold">Your profile</h2>
          <p className="text-sm text-gray-600">
            Update your name, about text, and more.
          </p>
        </Link>

        <Link
          href="/members/reading-list"
          className="rounded border p-4 hover:bg-gray-50 transition"
        >
          <h2 className="font-semibold">Reading list</h2>
          <p className="text-sm text-gray-600">
            Papers and resources curated by the lab.
          </p>
        </Link>
      </section>
    </main>
  );
}
