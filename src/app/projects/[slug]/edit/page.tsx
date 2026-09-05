import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/document-access";
import { publicMediaUrl } from "@/lib/media-url";
import ProjectParticipantEditor from "./ProjectParticipantEditor";

type Props = { params: Promise<{ slug: string }> };

export default async function ProjectEditPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("sitePages.projectEditor");
  const [viewer, project] = await Promise.all([
    getCurrentUser(),
    prisma.researchProject.findUnique({
      where: { slug },
      include: { participants: { select: { userId: true } } },
    }),
  ]);
  if (!project) notFound();
  if (!viewer?.isActive) redirect("/login");
  const allowed = viewer.role === "ADMIN" || project.participants.some((participant) => participant.userId === viewer.id);
  if (!allowed) redirect(`/projects/${project.slug}`);

  return <main className="project-participant-edit-page">
    <header className="project-edit-heading">
      <div>
        <p className="research-project-kicker">{t("kicker")}</p>
        <h1>{t("heading", { title: project.title })}</h1>
        <p className="muted">{t("permissions")}</p>
      </div>
      <Link href={`/projects/${project.slug}`} className="btn btn-muted">{t("back")}</Link>
    </header>
    <ProjectParticipantEditor initialProject={{
      id: project.id,
      slug: project.slug,
      title: project.title,
      caption: project.caption,
      body: project.body,
      tileImageUrl: project.tileImageUrl ? publicMediaUrl("project", project.id, "tile", project.updatedAt) : null,
      mainImageUrl: project.mainImageUrl ? publicMediaUrl("project", project.id, "main", project.updatedAt) : null,
      supportingImages: Array.isArray(project.supportingImages)
        ? project.supportingImages.flatMap((image, index) => typeof image === "string" ? [publicMediaUrl("project", project.id, `supporting-${index}`, project.updatedAt)] : [])
        : [],
    }} />
  </main>;
}
