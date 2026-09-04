import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BookOpen, Boxes, ClipboardList, FileText, NotebookPen, Settings, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

type AppRow = { value: string };
type Tile = { href: string; title: string; description?: string };
type MembersPageConfig = { heading?: string; subheading?: string; tiles?: Tile[] };
const INVENTORY_SHEET_URL = "https://docs.google.com/spreadsheets/d/1KlEFT2QXe0flbAX55PV9exZO7MY3pYE4TsQhsHQJe0k/edit?usp=sharing";
const ORDER_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSddU1g7tVP6nMa2Uj-UZ7WagbVTMl2i9Jb--qwZ-KmZGaOb1g/viewform?usp=dialog";
const ORDER_RECORDS_SHEET_URL = "https://docs.google.com/spreadsheets/d/156sYjx5bXclif_Lec8OT-3wbi6xN-ktFBomm0n63BDQ/edit?usp=sharing";

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
  if (href.includes("docs.google.com/spreadsheets")) return <Boxes {...props} />;
  if (href.includes("docs.google.com/forms")) return <ClipboardList {...props} />;
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
    subheading: t("welcomeName", { name: user.name || user.email }),
    tiles: [],
  };
  const canAccessLabOperations = user.role === "ADMIN" || user.membershipStatus === "ACTIVE";
  const requiredTiles: Tile[] = [
    { href: "/members/profile", title: t("publicProfile"), description: t("publicProfileDesc") },
    { href: "/database", title: t("documentDatabase"), description: t("documentDatabaseDesc") },
    { href: "/members/notifications", title: t("notifications"), description: t("notificationsDesc") },
    { href: "/members/notes", title: t("privateNotes"), description: t("privateNotesDesc") },
    ...(canAccessLabOperations ? [
      { href: INVENTORY_SHEET_URL, title: t("inventoryInstruments"), description: t("inventoryInstrumentsDesc") },
      { href: ORDER_FORM_URL, title: t("orderForm"), description: t("orderFormDesc") },
      {
        href: ORDER_RECORDS_SHEET_URL,
        title: user.role === "ADMIN" ? t("orderRecords") : t("orderRecordsViewOnly"),
        description: user.role === "ADMIN" ? t("orderRecordsAdminDesc") : t("orderRecordsViewDesc"),
      },
    ] : []),
    { href: "/members/settings", title: t("accountSettings"), description: t("accountSettingsDesc") },
  ];
  const restrictedOperationsLinks = new Set([INVENTORY_SHEET_URL, ORDER_FORM_URL, ORDER_RECORDS_SHEET_URL]);
  const configuredTiles = Array.isArray(configured.tiles)
    ? configured.tiles.filter((tile) => tile.href !== "/members/reading-list" && (canAccessLabOperations || !restrictedOperationsLinks.has(tile.href)))
    : [];
  const tiles = [...configuredTiles, ...requiredTiles.filter((required) => !configuredTiles.some((tile) => tile.href === required.href))];

  return <main className="members-dashboard">
    <header className="members-dashboard-header">
      <div>
        <span className="dashboard-eyebrow">{t("workspace")}</span>
        <h1>{configured.heading || t("heading")}</h1>
        <p className="muted">{configured.subheading || t("welcomeName", { name: user.name || user.email })}</p>
      </div>
      <div className="dashboard-account-chip" data-edit-ignore="true"><span>{user.name || user.email}</span><small>{user.role}</small></div>
    </header>

    <section className="dashboard-summary" aria-label={t("workspaceSummary")} data-edit-ignore="true">
      <div><strong>{unreadCount}</strong><span>{t("unreadNotifications")}</span></div>
      <div><strong>{accessibleDocuments}</strong><span>{t("availableDocuments")}</span></div>
      <div><strong>{user.membershipStatus.toLowerCase()}</strong><span>{t("membershipStatus")}</span></div>
    </section>

    <section className="member-dashboard-grid">
      {tiles.map((tile) => <Link key={tile.href} href={tile.href} className="dashboard-card" target={tile.href.startsWith("https://") ? "_blank" : undefined} rel={tile.href.startsWith("https://") ? "noopener noreferrer" : undefined}>
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
