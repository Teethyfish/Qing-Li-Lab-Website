// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import AnnouncementCarousel from "@/components/AnnouncementCarousel";
import EditableHomeContent from "@/components/EditableHomeContent";
import { BANNER_ASPECT_RATIO, BANNER_MAX_WIDTH } from "@/lib/banner";
import { publicMediaUrl } from "@/lib/media-url";

/**
 * Config keys this page reads:
 *  - "pi": { name, titleLines[], email, phone, office, imageUrl, intro }
 *  - "home.announcement": { title, href }
 *  - "home.welcome": string
 *  - "home.alumni": [{ name, slug?, role?, imageUrl? }]
 *  - "home.collaborators": [{ name, slug?, role?, imageUrl? }]
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
  const [t, tc, userLocale] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getLocale(),
  ]);
  type PiConfig = {
      name?: string;
      titleLines?: string[];
      email?: string;
      phone?: string;
      office?: string;
      imageUrl?: string;
      intro?: string;
  };
  type ConfiguredPerson = { name: string; slug?: string | null; role?: string; imageUrl?: string | null };

  // All independent Supabase reads run together; this avoids a long chain of
  // network round trips on every dynamic homepage request.
  const [piConfig, welcomeConfig, titleConfig, subtitleConfig, configuredAlumniValue, collaboratorsValue, members, accountAlumni, announcements, researchProjects] = await Promise.all([
    getConfig<PiConfig>("pi"),
    getConfig<string>("home.welcome"),
    getConfig<string>("home.labTitle"),
    getConfig<string>("home.labSubtitle"),
    getConfig<ConfiguredPerson[]>("home.alumni"),
    getConfig<ConfiguredPerson[]>("home.collaborators"),
    prisma.user.findMany({
      where: { membershipStatus: "ACTIVE", role: { in: ["MEMBER", "PI", "ADMIN"] as any[] } },
      select: { id: true, name: true, slug: true, imageUrl: true, role: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { membershipStatus: "ALUMNI" },
      select: { id: true, name: true, slug: true, imageUrl: true, role: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.announcement.findMany({
      where: { status: "ACTIVE" },
      orderBy: { order: "asc" },
      select: { id: true, imageUrl: true, title: true, text: true, hasDetailsPage: true, detailsSlug: true, updatedAt: true },
    }),
    prisma.researchProject.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, title: true, caption: true, tileImageUrl: true, updatedAt: true },
    }),
  ]);

  const pi = piConfig || ({
      name: "Qing X. Li",
      titleLines: [
        "Graduate Chair",
      ],
      email: "",
      phone: "",
      office: "",
      imageUrl: "",
      intro:
        "Our lab focuses on proteomics and the molecular basis of environmental and biological systems.",
  } as const);
  const welcome = welcomeConfig || t("welcomeDefault");
  const labTitle = titleConfig || "Qing X. Li's Lab";
  const labSubtitle = subtitleConfig || "Proteomics Core Facility";
  const configuredAlumni = configuredAlumniValue || [];
  const collaborators = collaboratorsValue || [];

  const alumni = [
    ...accountAlumni,
    ...configuredAlumni.filter(
      (configured) =>
        !accountAlumni.some(
          (account) =>
            (configured.slug && configured.slug === account.slug) ||
            configured.name.toLowerCase() === (account.name || "").toLowerCase()
        )
    ),
  ];

  // --- styles (no client handlers) ---
  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "2rem",
  };
  const twoCols: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "2rem",
    alignItems: "start",
  };
  const sectionTitle: React.CSSProperties = { fontSize: "1.125rem", fontWeight: 600 };
  const cardPad: React.CSSProperties = { padding: "1rem" };
  const peopleGrid: React.CSSProperties = {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  };
  const personCard: React.CSSProperties = {
    border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
    borderRadius: "calc(var(--tile-radius, 2) * 1px)",
    padding: "0.75rem",
    textDecoration: "none",
    color: "inherit",
    background: "var(--color-card)",
    boxShadow: "0 3px 10px color-mix(in oklab, var(--color-text) calc(var(--tile-shadow-opacity, 14) * 0.7%), transparent)",
  };

  return (
    <main style={{
      position: "relative",
      paddingBottom: "4rem",
    }}>
        <div style={{
          ...grid,
          position: "relative",
          width: "100%",
        }}>
        {/* ===== Big header at the top ===== */}
        <EditableHomeContent
          labTitle={labTitle}
          labSubtitle={labSubtitle}
        />

        {/* ===== Announcement Carousel ===== */}
        {announcements.length > 0 && (
          <section
            aria-label={t('announcementsLabel')}
            data-edit-ignore="true"
            style={{
              width: "100%",
              maxWidth: BANNER_MAX_WIDTH,
              aspectRatio: BANNER_ASPECT_RATIO,
              overflow: "hidden",
              background: "var(--color-card)",
              border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
              borderRadius: "calc(var(--tile-radius, 2) * 1px)",
              boxShadow: "0 4px 12px color-mix(in oklab, var(--color-text) calc(var(--tile-shadow-opacity, 14) * 1%), transparent)",
            }}
          >
            <AnnouncementCarousel announcements={announcements.map((announcement) => ({
              id: announcement.id,
              imageUrl: publicMediaUrl("announcement", announcement.id, "image", announcement.updatedAt),
              title: announcement.title,
              text: announcement.text,
              hasDetailsPage: announcement.hasDetailsPage,
              detailsSlug: announcement.detailsSlug,
            }))} locale={userLocale} />
          </section>
        )}

        {/* ===== Two-column block (PI sidebar on the left) ===== */}
        <section style={twoCols} className="home-two-cols">
        {/* Sidebar: PI card */}
        <aside style={{ display: "grid", gap: "1rem" }}>
          <div className="card" style={cardPad}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flexShrink: 0 }}>
              {pi.imageUrl ? (
                <div
                  style={{
                    position: "relative",
                    width: 96,
                    height: 96,
                    overflow: "hidden",
                    borderRadius: "9999px",
                    border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                  }}
                >
                  <Image
                    src={pi.imageUrl}
                    alt={pi.name || "PI"}
                    fill
                    sizes="96px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 96,
                    height: 96,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "9999px",
                    border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                    fontWeight: 600,
                    fontSize: "1.125rem",
                  }}
                >
                  {initials(pi.name)}
                </div>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                {pi.name || t('principalInvestigator')}
              </h2>

              <div style={{ marginTop: 8, fontSize: 14 }}>
                {pi.email && (
                  <div>
                    <span className="muted">{tc('email')}: </span>
                    <a href={`mailto:${pi.email}`}>{pi.email}</a>
                  </div>
                )}
                {pi.phone && (
                  <div>
                    <span className="muted">{tc('phone')}: </span>
                    <span>{pi.phone}</span>
                  </div>
                )}
                {pi.office && (
                  <div>
                    <span className="muted">{tc('office')}: </span>
                    <span>{pi.office}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {pi.intro && (
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "var(--color-text)" }}>
              {pi.intro}
            </p>
          )}
          </div>

          <Link
            href="/hiring"
            className="tile"
            style={{ display: "block", padding: "0.85rem 1rem" }}
          >
            <h2 style={{ margin: 0, fontSize: "1rem" }}>{t("hiringTitle")}</h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem" }}>
              {t("hiringText")}
            </p>
          </Link>

          <Link href="/cipdb" className="tile home-cipdb-tile">
            <h2>CIPDB</h2>
            <div className="home-cipdb-logo" aria-hidden="true">π</div>
            <p>{t("cipdbName")}</p>
            <span className="home-coming-soon">{t("comingSoon")}</span>
          </Link>
        </aside>

        {/* Main column */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {/* welcome card */}
          <div className="card" style={cardPad}>
            <h2 style={sectionTitle}>{t('welcome')}</h2>
            <p style={{ marginTop: 8, lineHeight: 1.75, color: "var(--color-text)" }}>{welcome}</p>
          </div>

          <section id="current-projects" className="home-projects-section" data-edit-ignore="true">
            <h3 style={sectionTitle}>{t("currentProjects")}</h3>
            <div className="home-project-grid">
              {researchProjects.map((project) => <Link key={project.id} href={`/projects/${project.slug}`} className="tile home-project-tile">
                <div className="home-project-image">
                  {project.tileImageUrl
                    ? <Image src={publicMediaUrl("project", project.id, "tile", project.updatedAt)} alt="" fill sizes="(max-width: 720px) 100vw, 390px" unoptimized style={{ objectFit: "cover" }} />
                    : <span>{t("projectPhotoPlaceholder")}</span>}
                </div>
                <div className="home-project-copy">
                  <h3>{project.title}</h3>
                  <p>{project.caption}</p>
                </div>
              </Link>)}
              {!researchProjects.length ? <p className="muted">{t("noCurrentProjects")}</p> : null}
            </div>
          </section>

          {/* members */}
          <section>
            <h3 style={sectionTitle}>{t('labMembers')}</h3>
            <div style={{ height: 8 }} />
            <div style={peopleGrid}>
              {members.length === 0 ? (
                <div className="muted">{t('noMembers')}</div>
              ) : (
                members.map((m) => (
                  <Link
                    key={m.slug || m.name || Math.random()}
                    href={m.slug ? `/people/${m.slug}` : "#"}
                    style={personCard}
                  >
                    <div
                      style={{
                        margin: "0 auto 0.5rem",
                        width: 80,
                        height: 80,
                        overflow: "hidden",
                        borderRadius: "9999px",
                        border:
                          "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "color-mix(in oklab, var(--color-text) 6%, #f3f4f6)",
                        color: "var(--color-text)",
                        fontWeight: 600,
                      }}
                    >
                      {m.imageUrl ? (
                        <Image
                          src={publicMediaUrl("user", m.id, "image", m.updatedAt)}
                          alt={m.name || tc('member')}
                          width={80}
                          height={80}
                          style={{ objectFit: "cover", borderRadius: "9999px" }}
                        />
                      ) : (
                        initials(m.name)
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 600 }}>{m.name || tc('unnamed')}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {m.role === "ADMIN" ? tc('admin') : m.role === "PI" ? tc('pi') : tc('member')}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* alumni */}
          <section>
            <h3 style={sectionTitle}>{t('alumni')}</h3>
            <div style={{ height: 8 }} />
            <div style={peopleGrid}>
              {alumni.length === 0 ? (
                <div className="muted">{t('noAlumni')}</div>
              ) : (
                alumni.map((a, i) => (
                  <Link
                    key={`${a.slug || a.name || i}-al`}
                    href={a.slug ? `/people/${a.slug}` : "#"}
                    style={personCard}
                  >
                    <div
                      style={{
                        margin: "0 auto 0.5rem",
                        width: 80,
                        height: 80,
                        overflow: "hidden",
                        borderRadius: "9999px",
                        border:
                          "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "color-mix(in oklab, var(--color-text) 6%, #f3f4f6)",
                        color: "var(--color-text)",
                        fontWeight: 600,
                      }}
                    >
                      {a.imageUrl ? (
                        <Image
                          src={"id" in a ? publicMediaUrl("user", a.id, "image", a.updatedAt) : a.imageUrl}
                          alt={a.name || t('alumni')}
                          width={80}
                          height={80}
                          style={{ objectFit: "cover", borderRadius: "9999px" }}
                        />
                      ) : (
                        initials(a.name)
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 600 }}>{a.name || t('alumni')}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {a.role || t('alumni')}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* collaborators */}
          <section>
            <h3 style={sectionTitle}>{t('collaborators')}</h3>
            <div style={{ height: 8 }} />
            <div style={peopleGrid}>
              {collaborators.length === 0 ? (
                <div className="muted">{t('noCollaborators')}</div>
              ) : (
                collaborators.map((c, i) => (
                  <Link
                    key={`${c.slug || c.name || i}-co`}
                    href={c.slug ? `/people/${c.slug}` : "#"}
                    style={personCard}
                  >
                    <div
                      style={{
                        margin: "0 auto 0.5rem",
                        width: 80,
                        height: 80,
                        overflow: "hidden",
                        borderRadius: "9999px",
                        border:
                          "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "color-mix(in oklab, var(--color-text) 6%, #f3f4f6)",
                        color: "var(--color-text)",
                        fontWeight: 600,
                      }}
                    >
                      {c.imageUrl ? (
                        <Image
                          src={c.imageUrl}
                          alt={c.name}
                          width={80}
                          height={80}
                          style={{ objectFit: "cover", borderRadius: "9999px" }}
                        />
                      ) : (
                        initials(c.name)
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {c.role || t('collaborator')}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
        </div>
    </main>
  );
}
