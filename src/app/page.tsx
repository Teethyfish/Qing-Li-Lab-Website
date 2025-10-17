import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import AuthButtons from "../components/AuthButtons";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;
  const isAuthed = !!user?.email;
  const role = (user?.role || "").toString().toUpperCase();
  const isAdmin = role === "ADMIN";

  // 👇 everything below stays inside the function
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Qing Li Lab — Internal</h1>
        <p className="text-gray-600">
          Quick links to common pages. You’re{" "}
          {isAuthed ? <b>{user?.email}</b> : "not logged in"}.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {/* Show Register only if not logged in */}
        {!isAuthed && (
          <Link
            href="/register"
            className="rounded border p-4 hover:bg-gray-50 transition"
          >
            <h2 className="font-semibold">Register</h2>
            <p className="text-sm text-gray-600">
              Request a lab website account.
            </p>
          </Link>
        )}

        {!isAuthed ? (
          <Link
            href="/login"
            className="rounded border p-4 hover:bg-gray-50 transition"
          >
            <h2 className="font-semibold">Login</h2>
            <p className="text-sm text-gray-600">
              Existing members sign in here.
            </p>
          </Link>
        ) : (
          <Link
            href="/members"
            className="rounded border p-4 hover:bg-gray-50 transition"
          >
            <h2 className="font-semibold">Members Area</h2>
            <p className="text-sm text-gray-600">
              Go to the members dashboard.
            </p>
          </Link>
        )}

        {/* Admin-only links */}
        {isAdmin && (
          <>
            <Link
              href="/members/approval"
              className="rounded border p-4 hover:bg-gray-50 transition"
            >
              <h2 className="font-semibold">Approval Dashboard</h2>
              <p className="text-sm text-gray-600">
                Review and approve registrations.
              </p>
            </Link>

            <Link
              href="/members/users"
              className="rounded border p-4 hover:bg-gray-50 transition"
            >
              <h2 className="font-semibold">Users (Admin)</h2>
              <p className="text-sm text-gray-600">
                Promote/demote, delete users.
              </p>
            </Link>
          </>
        )}
      </section>

      <footer className="flex items-center gap-3">
        <AuthButtons isAuthed={isAuthed} />
        {isAuthed && (
          <span className="text-xs text-gray-500">
            Role: <b>{role}</b>
          </span>
        )}
      </footer>
    </main>
  );
}
