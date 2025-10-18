import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const user = await prisma.user.findUnique({
    where: { slug },              // ✅ works now that slug is unique (nullable)
    select: { name: true, email: true, about: true },
  });

  if (!user) notFound();

  return (
    <main className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{user.name || slug}</h1>
        {user.email && <p className="text-sm text-gray-600">{user.email}</p>}
      </header>
      {user.about ? (
        <section className="prose prose-sm max-w-none">
          <p>{user.about}</p>
        </section>
      ) : (
        <p className="text-gray-500">No bio yet.</p>
      )}
    </main>
  );
}
