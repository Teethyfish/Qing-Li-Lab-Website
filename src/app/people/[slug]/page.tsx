import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { publicProfileFromUnknown } from "@/lib/public-profile";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ slug: string }> };

function initials(name?: string | null) {
  if (!name) return "??";
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "??";
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

  return <main className="public-profile" data-edit-ignore="true">
    <section className="card public-profile-header">
      <div className="public-profile-photo">
        {user.imageUrl ? <Image src={user.imageUrl} alt={user.name || "Profile"} width={160} height={160} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(user.name)}
      </div>
      <div>
        <h1>{user.name || slug}</h1>
        {contact.title ? <p className="public-profile-role">{contact.title}</p> : null}
        {contact.department ? <p className="muted">{contact.department}</p> : null}
      </div>
    </section>

    <div className="public-profile-grid">
      <section className="card profile-grid-wide">
        <h2>{t("about")}</h2>
        {user.about ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{user.about}</p> : <p className="muted">{t("noBio")}</p>}
      </section>

      {hasContact ? <section className="card profile-grid-standard">
        <h2>{t("contact")}</h2>
        <dl className="profile-contact-list">
          {contact.publicEmail ? <><dt>{t("email")}</dt><dd><a href={`mailto:${contact.publicEmail}`}>{contact.publicEmail}</a></dd></> : null}
          {contact.phone ? <><dt>{t("phone")}</dt><dd>{contact.phone}</dd></> : null}
          {contact.office ? <><dt>{t("office")}</dt><dd>{contact.office}</dd></> : null}
          {contact.website ? <><dt>{t("website")}</dt><dd><a href={contact.website} target="_blank" rel="noreferrer">{t("visitWebsite")}</a></dd></> : null}
        </dl>
      </section> : null}

      {profile.publications.length ? <section className="card profile-grid-wide">
        <h2>{t("publications")}</h2>
        <ol className="profile-publications">{profile.publications.map((publication) => <li key={publication.id}>
          <strong>{publication.url ? <a href={publication.url} target="_blank" rel="noreferrer">{publication.title}</a> : publication.title}</strong>
          {publication.citation ? <p>{publication.citation}</p> : null}
        </li>)}</ol>
      </section> : null}

      {profile.tiles.map((tile) => <section key={tile.id} className={`card profile-grid-${tile.size}`}>
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
  </main>;
}
