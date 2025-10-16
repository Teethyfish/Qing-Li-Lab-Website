// src/app/members/approval-debug/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route"; // relative import

export default async function ApprovalDebugPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const isAdmin = typeof role === "string" && role.toUpperCase() === "ADMIN";

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Approval Debug</h1>

      <section className="p-4 rounded border">
        <h2 className="font-medium">Computed</h2>
        <pre className="text-sm mt-2">
{JSON.stringify({ hasSession: !!session, role, isAdmin }, null, 2)}
        </pre>
      </section>

      <section className="p-4 rounded border">
        <h2 className="font-medium">Raw session</h2>
        <pre className="text-xs mt-2 overflow-auto">
{JSON.stringify(session, null, 2)}
        </pre>
      </section>

      <p className="text-sm text-gray-600">
        This page does not redirect. It only shows what the server sees for your session.
      </p>
    </main>
  );
}
