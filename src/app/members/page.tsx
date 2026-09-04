// src/app/members/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

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

  const t = await getTranslations('members');

  const cfg =
    (await getConfig<MembersPageConfig>("members.page")) ??
    ({
      heading: t('heading'),
      subheading: t('welcomeUser', { email }),
      tiles: [
        {
          href: "/members/profile",
          title: t('yourProfile'),
          description: t('yourProfileDesc'),
        },
        {
          href: "/database",
          title: "Document database",
          description: "View public resources and documents shared with you.",
        },
        {
          href: "/members/notifications",
          title: "Notifications",
          description: "Review new documents and lab updates.",
        },
      ],
    } as MembersPageConfig);

  const configuredTiles = Array.isArray(cfg.tiles) ? cfg.tiles : [];
  const requiredTiles: Tile[] = [
    {
      href: "/database",
      title: "Document database",
      description: "View public resources and documents shared with you.",
    },
    {
      href: "/members/notifications",
      title: "Notifications",
      description: "Review new documents and lab updates.",
    },
    {
      href: "/members/notes",
      title: "Private notes and reminders",
      description: "Organize private sticky-note pages and schedule email reminders.",
    },
  ];
  const tiles = [
    ...configuredTiles.filter((tile) => tile.href !== "/members/reading-list"),
    ...requiredTiles.filter(
      (required) => !configuredTiles.some((tile) => tile.href === required.href)
    ),
  ];

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          {cfg.heading || t('heading')}
        </h1>
        <p className="muted">{cfg.subheading || t('welcomeUser', { email })}</p>
      </header>

      <section
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
      >
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <article className="tile">
              <h3>{t.title}</h3>
              {t.description ? <p>{t.description}</p> : null}
            </article>
          </Link>
        ))}
      </section>
    </main>
  );
}
