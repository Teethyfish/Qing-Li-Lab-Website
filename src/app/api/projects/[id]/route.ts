import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";
import { projectImage, projectParticipants, projectSlug, projectText } from "@/lib/research-project";

export const runtime = "nodejs";
type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const editor = await getCurrentUser();
    if (!editor?.isActive) throw new Error("Forbidden");
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const title = projectText(body.title, 200);
    const caption = projectText(body.caption, 500);
    const projectBody = projectText(body.body, 30_000);
    if (!title || !caption || !projectBody) {
      return NextResponse.json({ error: "Title, caption, and body are required." }, { status: 400 });
    }
    const existing = await prisma.researchProject.findUnique({
      where: { id },
      select: {
        slug: true,
        isPublished: true,
        tileImageUrl: true,
        mainImageUrl: true,
        supportingImages: true,
        participants: { select: { userId: true, isCurrent: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const isAdmin = editor.role === "ADMIN";
    const isParticipant = existing.participants.some((participant) => participant.userId === editor.id);
    if (!isAdmin && !isParticipant) throw new Error("Forbidden");
    const canManageProject = isAdmin && body.contentOnly !== true;
    const slug = canManageProject ? projectSlug(body.slug || existing.slug) : existing.slug;
    if (!slug) return NextResponse.json({ error: "A valid URL slug is required." }, { status: 400 });
    const participants = canManageProject ? projectParticipants(body.participants) : existing.participants;
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
    let participantData: Array<{ projectId: string; userId: string; isCurrent: boolean }> = [];
    if (canManageProject && participants.length) {
      const validUsers = new Set((await prisma.user.findMany({
        where: { id: { in: participants.map((item) => item.userId) } },
        select: { id: true },
      })).map((user) => user.id));
      participantData = participants.filter((item) => validUsers.has(item.userId)).map((item) => ({ projectId: id, ...item }));
    }
    const operations: Prisma.PrismaPromise<unknown>[] = [
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
          isPublished: canManageProject ? body.isPublished !== false : existing.isPublished,
        },
      }),
    ];
    if (canManageProject) {
      operations.push(prisma.researchProjectParticipant.deleteMany({ where: { projectId: id } }));
      if (participantData.length) operations.push(prisma.researchProjectParticipant.createMany({ data: participantData }));
    }
    await prisma.$transaction(operations);
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
