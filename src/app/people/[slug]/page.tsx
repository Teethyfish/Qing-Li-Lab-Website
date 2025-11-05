import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

function initials(name?: string | null) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "??";
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const user = await prisma.user.findUnique({
    where: { slug },
    select: { name: true, email: true, about: true, imageUrl: true },
  });

  if (!user) notFound();

  return (
    <main className="mx-auto max-w-5xl p-6" style={{ paddingTop: "2rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Left: Profile picture + contact info */}
        <div className="tile" style={{ padding: "1.5rem" }}>
          {/* Profile picture */}
          <div
            style={{
              margin: "0 auto 1rem",
              width: 120,
              height: 120,
              borderRadius: "9999px",
              overflow: "hidden",
              border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "color-mix(in oklab, var(--color-text) 6%, #f3f4f6)",
              color: "var(--color-text)",
              fontWeight: 600,
              fontSize: "2rem",
            }}
          >
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.name || "Profile"}
                width={120}
                height={120}
                style={{ objectFit: "cover" }}
              />
            ) : (
              initials(user.name)
            )}
          </div>

          {/* Name and contact */}
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              {user.name || slug}
            </h1>
            {user.email && (
              <a
                href={`mailto:${user.email}`}
                style={{
                  fontSize: "0.9rem",
                  color: "var(--color-primary)",
                  textDecoration: "none",
                }}
              >
                {user.email}
              </a>
            )}
          </div>
        </div>

        {/* Right: About section */}
        <div className="tile" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>About</h2>
          {user.about ? (
            <p style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{user.about}</p>
          ) : (
            <p className="muted">No bio yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
