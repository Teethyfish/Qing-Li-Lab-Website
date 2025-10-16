// src/app/people/[slug]/page.tsx
import { PrismaClient } from "@prisma/client";
import { PEOPLE } from "@/data/people";

type Props = { params: { slug: string } };

const prisma = new PrismaClient();

export default async function PersonPublicPage({ params }: Props) {
  const person = PEOPLE.find(p => p.slug === params.slug);

  if (!person) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Not found</h1>
        <p>No person with slug: {params.slug}</p>
      </main>
    );
  }

  // Try to load a public bio from DB if we have an email on file
  let about: string | null = null;
  if (person.email) {
    const u = await prisma.user.findUnique({
      where: { email: person.email.toLowerCase() },
      select: { about: true, name: true },
    });
    // If the DB has a preferred display name, use it
    if (u?.name) person.name = u.name;
    about = u?.about ?? null;
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>{person.name}</h1>
      {about ? (
        <article style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{about}</article>
      ) : (
        <p style={{ marginTop: 12, color: "#666" }}>
          Bio coming soon.
        </p>
      )}
    </main>
  );
}
