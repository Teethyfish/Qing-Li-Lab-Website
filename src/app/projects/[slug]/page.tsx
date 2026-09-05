import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { publicMediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/document-access";

type Props = { params: Promise<{ slug: string }> };

function initials(name: string | null) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

export default async function ResearchProjectPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("sitePages.project");
  const [project, viewer] = await Promise.all([prisma.researchProject.findFirst({
    where: { slug, isPublished: true },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, slug: true, imageUrl: true, updatedAt: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  }), getCurrentUser()]);
  if (!project) notFound();
  const supportingImages = Array.isArray(project.supportingImages)
    ? project.supportingImages.flatMap((image, index) => typeof image === "string" ? [index] : [])
    : [];
  const current = project.participants.filter((participant) => participant.isCurrent);
  const past = project.participants.filter((participant) => !participant.isCurrent);
  const canEditProject = Boolean(viewer?.isActive && (
    viewer.role === "ADMIN" || project.participants.some((participant) => participant.userId === viewer.id)
  ));

  return <main className="research-project-page">
    <div className="research-project-actions">
      <Link href="/#current-projects" className="btn btn-muted">{t("back")}</Link>
      {canEditProject ? <Link href={`/projects/${project.slug}/edit`} className="btn btn-basic">{t("editProject")}</Link> : null}
    </div>

    <article className="research-project-shell">
      <div className={`research-project-hero${project.mainImageUrl ? " has-image" : ""}`}>
        {project.mainImageUrl
          ? <Image src={publicMediaUrl("project", project.id, "main", project.updatedAt)} alt={project.title} fill sizes="(max-width: 1280px) 100vw, 1150px" unoptimized priority style={{ objectFit: "cover" }} />
          : <span>{t("mainPhotoPlaceholder")}</span>}
      </div>

      <div className="research-project-content">
        <aside className="research-project-gallery" aria-label={t("supportingPhotos")}>
          {supportingImages.map((imageIndex, index) => <div className="research-project-gallery-image" key={imageIndex}>
            <Image src={publicMediaUrl("project", project.id, `supporting-${imageIndex}`, project.updatedAt)} alt={t("supportingPhotoAlt", { number: index + 1 })} fill sizes="(max-width: 720px) 50vw, 280px" unoptimized style={{ objectFit: "cover" }} />
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
  participants: Array<{ user: { id: string; name: string | null; slug: string | null; imageUrl: string | null; updatedAt: Date } }>;
  empty: string;
}) {
  return <div className="research-project-team-group">
    <h3>{title}</h3>
    {participants.length ? <div className="research-project-people">
      {participants.map(({ user }, index) => {
        const content = <><span className="research-project-person-image">
          {user.imageUrl ? <Image src={publicMediaUrl("user", user.id, "image", user.updatedAt)} alt="" width={80} height={80} unoptimized /> : initials(user.name)}
        </span><strong>{user.name || "—"}</strong></>;
        return user.slug
          ? <Link key={user.slug} href={`/people/${user.slug}`} className="research-project-person">{content}</Link>
          : <div key={`${user.name}-${index}`} className="research-project-person">{content}</div>;
      })}
    </div> : <p className="muted">{empty}</p>}
  </div>;
}
