import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import { projectImage, projectParticipants, projectSlug, projectText } from "@/lib/research-project";

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
    const existing = await prisma.researchProject.findUnique({ where: { id }, select: { tileImageUrl: true, mainImageUrl: true, supportingImages: true } });
    if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const existingSupporting = Array.isArray(existing.supportingImages) ? existing.supportingImages : [];
    const preserveOrReadImage = (value: unknown, slot: "tile" | "main") => {
      if (typeof value === "string" && value.includes(`/api/media/project/${encodeURIComponent(id)}/${slot}`)) {
        return slot === "tile" ? existing.tileImageUrl : existing.mainImageUrl;
      }
      return projectImage(value);
    };
    const nextSupporting = Array.isArray(body.supportingImages) ? body.supportingImages.slice(0, 4).flatMap((value) => {
      if (typeof value === "string") {
        const match = value.match(new RegExp(`/api/media/project/${encodeURIComponent(id)}/supporting-(\\d+)`));
        if (match) {
          const prior = existingSupporting[Number(match[1])];
          return typeof prior === "string" ? [prior] : [];
        }
      }
      const image = projectImage(value);
      return image ? [image] : [];
    }) : [];
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
          tileImageUrl: preserveOrReadImage(body.tileImageUrl, "tile"),
          mainImageUrl: preserveOrReadImage(body.mainImageUrl, "main"),
          supportingImages: nextSupporting as Prisma.InputJsonValue,
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
