// src/app/members/profile/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          Profile
        </h1>
        <p className="muted">Signed in as {email}</p>
      </header>

      <div className="tile">
        <h3>This is a temporary stub</h3>
        <p className="muted">
          If the Members area renders correctly now, the issue is inside the
          Prisma/server-actions version of this page. We’ll re-enable it next step.
        </p>
      </div>
    </main>
  );
}
