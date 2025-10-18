// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

/**
 * We read structured homepage content from AppConfig so this page
 * can later be edited by your Page Builder without touching code.
 *
 * Expected AppConfig keys (all optional, we fall back gracefully):
 * - "pi": {
 *     "name": "Qing X. Li",
 *     "titleLines": [
 *       "Department of Molecular Biosciences and Bioengineering",
 *       "Proteomics Center",
 *       "University of Hawai‘i at Mānoa"
 *     ],
 *     "email": "qingli@hawaii.edu",
 *     "phone": "(808) 555-1234",
 *     "office": "Gilmore 123",
 *     "imageUrl": "https://…/pi.jpg",
 *     "intro": "Short intro paragraph about PI / research focus."
 *   }
 * - "home.announcement": {
 *     "title": "New preprint out on XYZ proteins!",
 *     "href": "/pages/announcements/new-preprint"  // or external URL
 *   }
 * - "home.welcome": "Welcome! Intro paragraph about the lab …"
 * - "home.alumni": [{ "name":"A. Alum", "slug":"a-alum", "role":"Alumni", "imageUrl":"" }, ...]
 * - "home.collaborators": [{ "name":"C. Collab", "slug":null, "role":"Collaborator", "imageUrl":"" }, ...]
 */

type AppRow = { value: string };

async function getConfig<T = unknown>(key: string): Promise<T | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<AppRow[]>(
      `select value from "AppConfig" where key = $1`,
      key
    );
    if (!rows?.[0]?.value) return null;
    return JSON.parse(rows[0].value) as T;
  } catch {
    return null;
  }
}

function initials(name?: string | null) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "??";
}

export default async function HomePage() {
  // --- Config-driven content (future Page Builder can write these) ---
  const pi =
    (await getConfig<{
      name?: string;
      titleLines?: string[];
      email?: string;
      phone?: string;
      office?: string;
      imageUrl?: string;
      intro?: string;
    }>("pi")) ||
    ({
      name: "Qing X. Li",
      titleLines: [
        "Department of Molecular Biosciences and Bioengineering",
        "Proteomics Center",
        "University of Hawai‘i at Mānoa",
      ],
      email: "",
      phone: "",
      office: "",
      imageUrl: "",
      intro:
        "Our lab focuses on proteomics and the molecular basis of environmental and biological systems.",
    } as const);

  const announcement =
    (await getConfig<{ title?: string; href?: string }>("home.announcement")) ||
    null;

  const welcome =
    (await getConfig<string>("home.welcome")) ||
    "Welcome! We are a research lab studying proteomics and molecular biosciences.";

  const alumni =
    (await getConfig<Array<{ name: string; slug?: string | null; role?: string; imageUrl?: string | null }>>(
      "home.alumni"
    )) || [];

  const collaborators =
    (await getConfig<Array<{ name: string; slug?: string | null; role?: string; imageUrl?: string | null }>>(
      "home.collaborators"
    )) || [];

  // --- Live members from DB (role = MEMBER) ---
  const members = await prisma.user.findMany({
    where: { role: "MEMBER" as any },
    select: { name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="grid gap-8 md:grid-cols-[320px,1fr]">
      {/* ===== Left sidebar: PI card ===== */}
      <aside className="card self-start">
        <div className="flex items-start gap-4">
          {/* PI image (optional) */}
          <div className="shrink-0">
            {pi.imageUrl ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-full border">
                <Image
                  src={pi.imageUrl}
                  alt={pi.name || "PI"}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border text-xl font-semibold">
                {initials(pi.name)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              {pi.name || "Principal Investigator"}
            </h2>
            <div className="mt-1 space-y-0.5 text-sm text-gray-600">
              {(pi.titleLines || []).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            <div className="mt-3 space-y-1 text-sm">
              {pi.email && (
                <div>
                  <span className="muted">Email: </span>
                  <a href={`mailto:${pi.email}`}>{pi.email}</a>
                </div>
              )}
              {pi.phone && (
                <div>
                  <span className="muted">Phone: </span>
                  <span>{pi.phone}</span>
                </div>
              )}
              {pi.office && (
                <div>
                  <span className="muted">Office: </span>
                  <span>{pi.office}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {pi.intro && (
          <p className="mt-4 text-sm leading-6 text-gray-700">{pi.intro}</p>
        )}
      </aside>

      {/* ===== Main column ===== */}
      <section className="space-y-8">
        {/* Header block with institution lines */}
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Qing X. Li&apos;s Lab</h1>
          <div className="muted">
            {pi.titleLines?.[0] || "Department of Molecular Biosciences and Bioengineering"}
          </div>
          <div className="muted">{pi.titleLines?.[1] || "Proteomics Center"}</div>
          <div className="muted">
            {pi.titleLines?.[2] || "University of Hawai‘i at Mānoa"}
          </div>
        </header>

        {/* Announcements bar (thin) */}
        <div className="rounded border px-3 py-2">
          {announcement?.title ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block rounded bg-yellow-100 px-2 py-0.5 text-yellow-900">
                Announcement
              </span>
              {announcement.href ? (
                <Link href={announcement.href} className="underline">
                  {announcement.title}
                </Link>
              ) : (
                <span>{announcement.title}</span>
              )}
            </div>
          ) : (
            <div className="muted text-sm">No announcements yet.</div>
          )}
        </div>

        {/* Welcome / intro */}
        <div className="card">
          <h2 className="mb-2 text-lg font-semibold">Welcome!</h2>
          <p className="text-gray-700 leading-7">{welcome}</p>
        </div>

        {/* Members grid */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Lab Members</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {members.length === 0 ? (
              <div className="muted">No members yet.</div>
            ) : (
              members.map((m) => (
                <Link
                  key={m.slug || m.name || Math.random()}
                  href={m.slug ? `/people/${m.slug}` : "#"}
                  className="group rounded border p-3 transition hover:bg-gray-50"
                >
                  <div className="mx-auto mb-2 h-20 w-20 overflow-hidden rounded-full border">
                    {/* Placeholder circle with initials (you'll add profile images later) */}
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-lg font-semibold text-gray-700">
                      {initials(m.name)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{m.name || "Unnamed"}</div>
                    <div className="muted text-xs">Member</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Alumni grid (from config) */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Alumni</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {alumni.length === 0 ? (
              <div className="muted">No alumni listed yet.</div>
            ) : (
              alumni.map((a, i) => (
                <Link
                  key={`${a.slug || a.name || i}-al`}
                  href={a.slug ? `/people/${a.slug}` : "#"}
                  className="group rounded border p-3 transition hover:bg-gray-50"
                >
                  <div className="mx-auto mb-2 h-20 w-20 overflow-hidden rounded-full border">
                    {a.imageUrl ? (
                      <Image
                        src={a.imageUrl}
                        alt={a.name}
                        width={80}
                        height={80}
                        className="h-20 w-20 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-lg font-semibold text-gray-700">
                        {initials(a.name)}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{a.name}</div>
                    <div className="muted text-xs">{a.role || "Alumni"}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Collaborators grid (from config) */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Collaborators</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {collaborators.length === 0 ? (
              <div className="muted">No collaborators listed yet.</div>
            ) : (
              collaborators.map((c, i) => (
                <Link
                  key={`${c.slug || c.name || i}-co`}
                  href={c.slug ? `/people/${c.slug}` : "#"}
                  className="group rounded border p-3 transition hover:bg-gray-50"
                >
                  <div className="mx-auto mb-2 h-20 w-20 overflow-hidden rounded-full border">
                    {c.imageUrl ? (
                      <Image
                        src={c.imageUrl}
                        alt={c.name}
                        width={80}
                        height={80}
                        className="h-20 w-20 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-lg font-semibold text-gray-700">
                        {initials(c.name)}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{c.name}</div>
                    <div className="muted text-xs">{c.role || "Collaborator"}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
