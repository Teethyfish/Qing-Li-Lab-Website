import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import { projectImage, projectParticipants, projectSlug, projectText, supportingProjectImages } from "@/lib/research-project";

export const runtime = "nodejs";
type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    await requireAdminUser();
    const { id } = await params;
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
    const participantData = participants.filter((item) => validUsers.has(item.userId)).map((item) => ({ projectId: id, ...item }));
    await prisma.$transaction([
      prisma.researchProject.update({
        where: { id },
        data: {
          title,
          slug,
          caption,
          body: projectBody,
          tileImageUrl: projectImage(body.tileImageUrl),
          mainImageUrl: projectImage(body.mainImageUrl),
          supportingImages: supportingProjectImages(body.supportingImages) as Prisma.InputJsonValue,
          isPublished: body.isPublished !== false,
        },
      }),
      prisma.researchProjectParticipant.deleteMany({ where: { projectId: id } }),
      ...(participantData.length ? [prisma.researchProjectParticipant.createMany({ data: participantData })] : []),
    ]);
    revalidatePath("/");
    revalidatePath(`/projects/${slug}`);
    revalidatePath("/members/projects");
    return NextResponse.json({ success: true, slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update project.";
    const status = message.includes("Unique constraint") ? 409 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: status === 409 ? "That URL slug is already in use." : message }, { status });
  }
}

export async function DELETE(_: NextRequest, { params }: Props) {
  try {
    await requireAdminUser();
    const { id } = await params;
    await prisma.researchProject.deleteMany({ where: { id } });
    revalidatePath("/");
    revalidatePath("/members/projects");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete project.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}
