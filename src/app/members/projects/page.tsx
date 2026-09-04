import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import ProjectManager from "./ProjectManager";

export const runtime = "nodejs";

export default async function ProjectAdminPage() {
  await requireAdminUser().catch(() => redirect("/"));
  const t = await getTranslations("sitePages.projectsAdmin");
  const [projects, users] = await Promise.all([
    prisma.researchProject.findMany({
      orderBy: { createdAt: "asc" },
      include: { participants: true },
    }),
    prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true, membershipStatus: true },
    }),
  ]);

  return <main className="project-admin-page">
    <header>
      <h1>{t("title")}</h1>
      <p className="muted">{t("subtitle")}</p>
    </header>
    <ProjectManager
      initialProjects={projects.map((project) => ({
        id: project.id,
        slug: project.slug,
        title: project.title,
        caption: project.caption,
        body: project.body,
        tileImageUrl: project.tileImageUrl,
        mainImageUrl: project.mainImageUrl,
        supportingImages: Array.isArray(project.supportingImages)
          ? project.supportingImages.filter((image): image is string => typeof image === "string")
          : [],
        isPublished: project.isPublished,
        participants: project.participants.map(({ userId, isCurrent }) => ({ userId, isCurrent })),
      }))}
      users={users}
    />
  </main>;
}
