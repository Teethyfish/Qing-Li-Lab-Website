// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
  // --- Config-driven content ---
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
        "Graduate Chair",
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

  // --- Live members from DB (current members only) ---
  const members = await prisma.user.findMany({
    where: { role: "MEMBER" as any },
    select: { name: true, slug: true, imageUrl: true },
    orderBy: { name: "asc" },
  });

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
  const thinBar: React.CSSProperties = {
    border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
    borderRadius: "var(--radius-md)",
    padding: "0.5rem 0.75rem",
    background: "var(--color-bg)",
  };
  const peopleGrid: React.CSSProperties = {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  };
  const personCard: React.CSSProperties = {
    border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
    borderRadius: "var(--radius-lg)",
    padding: "0.75rem",
    textDecoration: "none",
    color: "inherit",
  };

  return (
    <main style={grid}>
      {/* ===== Big header at the top ===== */}
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Qing X. Li&apos;s Lab</h1>
        <div className="muted">{pi.titleLines?.[0] || "Department of Molecular Biosciences and Bioengineering"}</div>
        <div className="muted">{pi.titleLines?.[1] || "Proteomics Core Facility"}</div>
        <div className="muted">{pi.titleLines?.[2] || "University of Hawai‘i at Mānoa"}</div>
      </header>

      {/* ===== Two-column block (PI sidebar on the left) ===== */}
      <section style={twoCols} className="home-two-cols">
        {/* Sidebar: PI card */}
        <aside className="card" style={cardPad}>
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
                {pi.name || "Principal Investigator"}
              </h2>

              <div style={{ marginTop: 4, lineHeight: 1.4, fontSize: 14 }} className="muted">
                {(pi.titleLines || []).map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>

              <div style={{ marginTop: 8, fontSize: 14 }}>
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
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "var(--color-text)" }}>
              {pi.intro}
            </p>
          )}
        </aside>

        {/* Main column */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {/* announcement bar */}
          <div style={thinBar}>
            {announcement?.title ? (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: 14 }}>
                <span
                  style={{
                    background: "color-mix(in oklab, var(--color-primary) 20%, white)",
                    color: "var(--color-text)",
                    borderRadius: "9999px",
                    padding: "0.1rem 0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Announcement
                </span>
                {announcement.href ? (
                  <Link href={announcement.href} style={{ textDecoration: "underline" }}>
                    {announcement.title}
                  </Link>
                ) : (
                  <span>{announcement.title}</span>
                )}
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 14 }}>
                No announcements yet.
              </div>
            )}
          </div>

          {/* welcome card */}
          <div className="card" style={cardPad}>
            <h2 style={sectionTitle}>Welcome!</h2>
            <p style={{ marginTop: 8, lineHeight: 1.75, color: "var(--color-text)" }}>{welcome}</p>
          </div>

          {/* members */}
          <section>
            <h3 style={sectionTitle}>Lab Members</h3>
            <div style={{ height: 8 }} />
            <div style={peopleGrid}>
              {members.length === 0 ? (
                <div className="muted">No members yet.</div>
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
                          src={m.imageUrl}
                          alt={m.name || "Member"}
                          width={80}
                          height={80}
                          style={{ objectFit: "cover", borderRadius: "9999px" }}
                        />
                      ) : (
                        initials(m.name)
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 600 }}>{m.name || "Unnamed"}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Member
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* alumni */}
          <section>
            <h3 style={sectionTitle}>Alumni</h3>
            <div style={{ height: 8 }} />
            <div style={peopleGrid}>
              {alumni.length === 0 ? (
                <div className="muted">No alumni listed yet.</div>
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
                          src={a.imageUrl}
                          alt={a.name}
                          width={80}
                          height={80}
                          style={{ objectFit: "cover", borderRadius: "9999px" }}
                        />
                      ) : (
                        initials(a.name)
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 600 }}>{a.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {a.role || "Alumni"}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* collaborators */}
          <section>
            <h3 style={sectionTitle}>Collaborators</h3>
            <div style={{ height: 8 }} />
            <div style={peopleGrid}>
              {collaborators.length === 0 ? (
                <div className="muted">No collaborators listed yet.</div>
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
                        {c.role || "Collaborator"}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
