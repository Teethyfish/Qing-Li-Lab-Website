import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import { projectImage, projectParticipants, projectSlug, projectText, supportingProjectImages } from "@/lib/research-project";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
    const body = await request.json() as Record<string, unknown>;
    const title = projectText(body.title, 200);
    const slug = projectSlug(body.slug || title);
    const caption = projectText(body.caption, 500);
    const projectBody = projectText(body.body, 30_000);
    if (!title || !slug || !caption || !projectBody) {
      return NextResponse.json({ error: "Title, URL slug, caption, and body are required." }, { status: 400 });
    }
    const participants = projectParticipants(body.participants);
    const validUsers = participants.length
      ? new Set((await prisma.user.findMany({ where: { id: { in: participants.map((item) => item.userId) } }, select: { id: true } })).map((user) => user.id))
      : new Set<string>();
    const project = await prisma.researchProject.create({
      data: {
        title,
        slug,
        caption,
        body: projectBody,
        tileImageUrl: projectImage(body.tileImageUrl),
        mainImageUrl: projectImage(body.mainImageUrl),
        supportingImages: supportingProjectImages(body.supportingImages) as Prisma.InputJsonValue,
        isPublished: body.isPublished !== false,
        participants: { create: participants.filter((item) => validUsers.has(item.userId)) },
      },
    });
    revalidatePath("/");
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/members/projects");
    return NextResponse.json({ id: project.id, slug: project.slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create project.";
    const status = message.includes("Unique constraint") ? 409 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: status === 409 ? "That URL slug is already in use." : message }, { status });
  }
}
