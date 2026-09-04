import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

function initials(name: string | null) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

export default async function ResearchProjectPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("sitePages.project");
  const project = await prisma.researchProject.findFirst({
    where: { slug, isPublished: true },
    include: {
      participants: {
        include: { user: { select: { name: true, slug: true, imageUrl: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
  if (!project) notFound();
  const supportingImages = Array.isArray(project.supportingImages)
    ? project.supportingImages.filter((image): image is string => typeof image === "string")
    : [];
  const current = project.participants.filter((participant) => participant.isCurrent);
  const past = project.participants.filter((participant) => !participant.isCurrent);

  return <main className="research-project-page">
    <Link href="/#current-projects" className="btn btn-muted">{t("back")}</Link>

    <article className="research-project-shell">
      <div className={`research-project-hero${project.mainImageUrl ? " has-image" : ""}`}>
        {project.mainImageUrl
          ? <Image src={project.mainImageUrl} alt={project.title} fill sizes="(max-width: 1280px) 100vw, 1150px" unoptimized={project.mainImageUrl.startsWith("data:")} priority style={{ objectFit: "cover" }} />
          : <span>{t("mainPhotoPlaceholder")}</span>}
      </div>

      <div className="research-project-content">
        <aside className="research-project-gallery" aria-label={t("supportingPhotos")}>
          {supportingImages.map((image, index) => <div className="research-project-gallery-image" key={index}>
            <Image src={image} alt={t("supportingPhotoAlt", { number: index + 1 })} fill sizes="(max-width: 720px) 50vw, 280px" unoptimized={image.startsWith("data:")} style={{ objectFit: "cover" }} />
          </div>)}
          {!supportingImages.length ? <div className="research-project-gallery-empty">{t("supportingPhotoPlaceholder")}</div> : null}
        </aside>
        <section className="research-project-copy">
          <p className="research-project-kicker">{t("currentResearch")}</p>
          <h1>{project.title}</h1>
          <p className="research-project-caption">{project.caption}</p>
          <div className="research-project-body">{project.body}</div>
        </section>
      </div>

      <section className="research-project-team">
        <h2>{t("team")}</h2>
        <TeamGroup title={t("currentlyInvolved")} participants={current} empty={t("noCurrentMembers")} />
        <TeamGroup title={t("previouslyInvolved")} participants={past} empty={t("noPastMembers")} />
      </section>
    </article>
  </main>;
}

function TeamGroup({ title, participants, empty }: {
  title: string;
  participants: Array<{ user: { name: string | null; slug: string | null; imageUrl: string | null } }>;
  empty: string;
}) {
  return <div className="research-project-team-group">
    <h3>{title}</h3>
    {participants.length ? <div className="research-project-people">
      {participants.map(({ user }, index) => {
        const content = <><span className="research-project-person-image">
          {user.imageUrl ? <Image src={user.imageUrl} alt="" width={48} height={48} unoptimized={user.imageUrl.startsWith("data:")} /> : initials(user.name)}
        </span><strong>{user.name || "—"}</strong></>;
        return user.slug
          ? <Link key={user.slug} href={`/people/${user.slug}`} className="research-project-person">{content}</Link>
          : <div key={`${user.name}-${index}`} className="research-project-person">{content}</div>;
      })}
    </div> : <p className="muted">{empty}</p>}
  </div>;
}
