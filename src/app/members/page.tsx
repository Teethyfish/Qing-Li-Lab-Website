// src/app/members/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

type Tile = { href: string; title: string; description?: string };
type MembersPageConfig = {
  heading?: string;
  subheading?: string;
  tiles?: Tile[];
};

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  const email = (session?.user as any)?.email as string | undefined;
  if (!email) redirect("/login");

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

  const tiles = Array.isArray(cfg.tiles) ? cfg.tiles : [];

  // Shared card style (matches theme variables)
  const cardStyle: React.CSSProperties = {
    background: "var(--color-card)",
    border:
      "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
    borderRadius: 12,
    padding: "1rem",
    textDecoration: "none",
    color: "inherit",
    boxShadow:
      "0 1px 0 color-mix(in oklab, var(--color-text) 8%, transparent)",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "1.05rem",
    fontWeight: 600,
    lineHeight: 1.3,
    margin: 0,
  };

  const descStyle: React.CSSProperties = {
    marginTop: 6,
    color: "var(--color-muted)",
    fontSize: "0.92rem",
    lineHeight: 1.4,
  };

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          {cfg.heading || "Members Area"}
        </h1>
        <p className="muted">{cfg.subheading || `Welcome, ${email}`}</p>
      </header>

      <section
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card" style={cardStyle}>
            <h3 style={titleStyle}>{t.title}</h3>
            {t.description ? <p style={descStyle}>{t.description}</p> : null}
          </Link>
        ))}
      </section>
    </main>
  );
}
