import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { PROFILE_HEADER_LAYOUT, publicProfileFromUnknown, type ProfileBlockLayout } from "@/lib/public-profile";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ slug: string }> };

function initials(name?: string | null) {
  if (!name) return "??";
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "??";
}

function doiUrl(doi: string) {
  const value = doi.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  return value ? `https://doi.org/${encodeURI(value)}` : "";
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("sitePages.profile");
  if (!slug) notFound();
  const user = await prisma.user.findUnique({
    where: { slug },
    select: { name: true, email: true, about: true, imageUrl: true, profileContent: true },
  });
  if (!user) notFound();
  const profile = publicProfileFromUnknown(user.profileContent, user.email);
  const contact = profile.contact;
  const hasContact = Boolean(contact.publicEmail || contact.title || contact.department || contact.phone || contact.office || contact.website);
  const visibleTiles = profile.tiles.filter((tile) => tile.type !== "photo" || tile.imageUrl);
  const visibleLayouts = [
    PROFILE_HEADER_LAYOUT,
    ...(hasContact ? [profile.layout.contact] : []),
    ...(profile.publications.length ? [profile.layout.publications] : []),
    ...visibleTiles.map((tile) => tile.layout),
  ];
  const dashboardHeight = Math.max(760, ...visibleLayouts.map((layout) => layout.y + layout.height + 30));
  const tileStyle = (layout: ProfileBlockLayout): React.CSSProperties => ({
    left: layout.x,
    top: layout.y,
    width: layout.width,
    height: layout.height,
    zIndex: layout.zIndex,
  });

  return <main className="public-profile" data-edit-ignore="true">
    <div className="public-profile-dashboard-scroll">
      <div className="public-profile-dashboard" style={{ height: dashboardHeight }}>
      <section className="card public-profile-header public-profile-dashboard-tile" style={tileStyle(PROFILE_HEADER_LAYOUT)}>
        <div className="public-profile-identity">
          <div className="public-profile-photo">
            {user.imageUrl ? <Image src={user.imageUrl} alt={user.name || "Profile"} width={160} height={160} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(user.name)}
          </div>
          <div>
            <h1>{user.name || slug}</h1>
            {contact.title ? <p className="public-profile-role">{contact.title}</p> : null}
            {contact.department ? <p className="muted">{contact.department}</p> : null}
          </div>
        </div>
        <div className="public-profile-about">
          <h2>{t("about")}</h2>
          {user.about ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{user.about}</p> : <p className="muted">{t("noBio")}</p>}
        </div>
      </section>

      {hasContact ? <section className="card public-profile-dashboard-tile" style={tileStyle(profile.layout.contact)}>
        <h2>{t("contact")}</h2>
        <dl className="profile-contact-list">
          {contact.publicEmail ? <><dt>{t("email")}</dt><dd><a href={`mailto:${contact.publicEmail}`}>{contact.publicEmail}</a></dd></> : null}
          {contact.phone ? <><dt>{t("phone")}</dt><dd>{contact.phone}</dd></> : null}
          {contact.office ? <><dt>{t("office")}</dt><dd>{contact.office}</dd></> : null}
          {contact.website ? <><dt>{t("website")}</dt><dd><a href={contact.website} target="_blank" rel="noreferrer">{t("visitWebsite")}</a></dd></> : null}
        </dl>
      </section> : null}

      {profile.publications.length ? <section className="card public-profile-dashboard-tile" style={tileStyle(profile.layout.publications)}>
        <h2>{t("publications")}</h2>
        <ol className="profile-publications scholar-publications">{profile.publications.map((publication) => {
          const href = doiUrl(publication.doi) || publication.url;
          return <li key={publication.id}>
          <strong>{href ? <a href={href} target="_blank" rel="noreferrer">{publication.title}</a> : publication.title}</strong>
          {publication.authors ? <p className="scholar-authors">{publication.authors}</p> : null}
          {publication.journal || publication.publishDate ? <p className="scholar-source">{[publication.journal, publication.publishDate].filter(Boolean).join(" · ")}</p> : null}
          {publication.description ? <p className="scholar-description">{publication.description}</p> : null}
          {publication.doi ? <a className="scholar-doi" href={doiUrl(publication.doi)} target="_blank" rel="noreferrer">DOI: {publication.doi}</a> : null}
        </li>})}</ol>
      </section> : null}

      {visibleTiles.map((tile) => <section key={tile.id} className="card public-profile-dashboard-tile" style={tileStyle(tile.layout)}>
        {tile.type === "photo" ? <>
          <img className="public-profile-tile-image" src={tile.imageUrl} alt={tile.title || tile.content || "Profile photo"} />
          {tile.title ? <h2>{tile.title}</h2> : null}
          {tile.content ? <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{tile.content}</p> : null}
        </> : <>
          {tile.title ? <h2>{tile.title}</h2> : null}
          {tile.content ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{tile.content}</p> : null}
        </>}
      </section>)}
      </div>
    </div>
  </main>;
}
