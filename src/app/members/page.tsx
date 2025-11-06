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
  const t = await getTranslations("members");
  const session = await getServerSession(authOptions);
  const email = (session?.user as any)?.email as string | undefined;
  if (!email) redirect("/login");

  const cfg =
    (await getConfig<MembersPageConfig>("members.page")) ??
    ({
      heading: t("heading"),
      subheading: t("subheading", { email }),
      tiles: [
        {
          href: "/members/profile",
          title: t("profileTile.title"),
          description: t("profileTile.description"),
        },
        {
          href: "/members/reading-list",
          title: t("readingTile.title"),
          description: t("readingTile.description"),
        },
      ],
    } as MembersPageConfig);

  const tiles = Array.isArray(cfg.tiles) ? cfg.tiles : [];

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 4 }}>
          {cfg.heading || t("heading")}
        </h1>
        <p className="muted">{cfg.subheading || t("subheading", { email })}</p>
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
