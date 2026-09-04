import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BookOpen, FileText, NotebookPen, Settings, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

type AppRow = { value: string };
type Tile = { href: string; title: string; description?: string };
type MembersPageConfig = { heading?: string; subheading?: string; tiles?: Tile[] };

async function getConfig<T = unknown>(key: string): Promise<T | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<AppRow[]>(`select value from "AppConfig" where key = $1`, key);
    return rows[0]?.value ? JSON.parse(rows[0].value) as T : null;
  } catch { return null; }
}

function DashboardIcon({ href }: { href: string }) {
  const props = { size: 23, strokeWidth: 1.8, "aria-hidden": true as const };
  if (href.includes("notification")) return <Bell {...props} />;
  if (href.includes("notes")) return <NotebookPen {...props} />;
  if (href.includes("profile")) return <UserRound {...props} />;
  if (href.includes("settings")) return <Settings {...props} />;
  if (href.includes("database")) return <BookOpen {...props} />;
  return <FileText {...props} />;
}

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user?.isActive) redirect("/login");
  const t = await getTranslations("members");
  const [cfg, unreadCount, accessibleDocuments] = await Promise.all([
    getConfig<MembersPageConfig>("members.page"),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.labDocument.count({ where: { OR: [{ isPublic: true }, { recipients: { some: { userId: user.id } } }] } }),
  ]);
  const configured = cfg ?? {
    heading: t("heading"),
    subheading: `Welcome, ${user.name || user.email}`,
    tiles: [],
  };
  const requiredTiles: Tile[] = [
    { href: "/members/profile", title: "Public profile", description: "Update your biography, contact details, publications, and profile tiles." },
    { href: "/database", title: "Document database", description: "Open public resources and documents shared directly with you." },
    { href: "/members/notifications", title: "Notifications", description: "Review document notices, instrument requests, and lab updates." },
    { href: "/members/notes", title: "Private notes", description: "Use private pages, sticky notes, drawings, and scheduled reminders." },
    { href: "/members/settings", title: "Account settings", description: "Change your password, language, and account preferences." },
  ];
  const configuredTiles = Array.isArray(configured.tiles) ? configured.tiles.filter((tile) => tile.href !== "/members/reading-list") : [];
  const tiles = [...configuredTiles, ...requiredTiles.filter((required) => !configuredTiles.some((tile) => tile.href === required.href))];

  return <main className="members-dashboard">
    <header className="members-dashboard-header">
      <div>
        <span className="dashboard-eyebrow">Member workspace</span>
        <h1>{configured.heading || t("heading")}</h1>
        <p className="muted">{configured.subheading || `Welcome, ${user.name || user.email}`}</p>
      </div>
      <div className="dashboard-account-chip" data-edit-ignore="true"><span>{user.name || user.email}</span><small>{user.role}</small></div>
    </header>

    <section className="dashboard-summary" aria-label="Workspace summary" data-edit-ignore="true">
      <div><strong>{unreadCount}</strong><span>Unread notifications</span></div>
      <div><strong>{accessibleDocuments}</strong><span>Available documents</span></div>
      <div><strong>{user.membershipStatus.toLowerCase()}</strong><span>Membership status</span></div>
    </section>

    <section className="member-dashboard-grid">
      {tiles.map((tile) => <Link key={tile.href} href={tile.href} className="dashboard-card">
        <span className="dashboard-card-icon"><DashboardIcon href={tile.href} /></span>
        <div>
          <h2>{tile.title}</h2>
          {tile.description ? <p>{tile.description}</p> : null}
        </div>
        <span className="dashboard-card-arrow" aria-hidden="true">→</span>
      </Link>)}
    </section>
  </main>;
}
