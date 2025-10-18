// src/app/members/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AppRow = { value: string };

// Tiny helper to read JSON config blocks from AppConfig
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

/**
 * Optional config shape for a simple "tiles" members dashboard.
 * You can expand this later in the page builder.
 */
type Tile = {
  href: string;
  title: string;
  description?: string;
};
type MembersPageConfig = {
  heading?: string;
  subheading?: string;
  tiles?: Tile[];
};

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  const email = (session?.user as any)?.email as string | undefined;
  if (!email) redirect("/login");

  // 1) Try to load a config (for future page-builder)
  const cfg =
    (await getConfig<MembersPageConfig>("members.page")) ??
    ({
      heading: "Members Area",
      subheading: `Welcome, ${email}`,
      tiles: [
        {
          href: "/members/profile",
          title: "Your profile",
          description: "Update your name, about text, and more.",
        },
        {
          href: "/members/reading-list",
          title: "Reading list",
          description: "Papers and resources curated by the lab.",
        },
      ],
    } as MembersPageConfig);

  const tiles: Tile[] = Array.isArray(cfg.tiles) ? cfg.tiles : [];

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{cfg.heading || "Members Area"}</h1>
        <p className="muted">{cfg.subheading || `Welcome, ${email}`}</p>
      </header>

      {tiles.length > 0 ? (
        <section
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {tiles.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="card"
              style={{
                padding: "1rem",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <h2 className="font-semibold">{t.title}</h2>
              {t.description ? (
                <p className="muted text-sm" style={{ marginTop: 6 }}>
                  {t.description}
                </p>
              ) : null}
            </Link>
          ))}
        </section>
      ) : (
        <p className="muted">No items configured yet.</p>
      )}
    </main>
  );
}
