import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/document-access";
import { deleteDriveDocument } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const data: { title?: string; description?: string; emailSubject?: string; isPublic?: boolean; categoryId?: string | null } = {};
    if (Object.prototype.hasOwnProperty.call(body, "title")) {
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
      if (!title) return NextResponse.json({ error: "Document title is required." }, { status: 400 });
      data.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(body, "description")) data.description = typeof body.description === "string" ? body.description.trim().slice(0, 10_000) : "";
    if (Object.prototype.hasOwnProperty.call(body, "emailSubject")) data.emailSubject = typeof body.emailSubject === "string" ? body.emailSubject.trim().slice(0, 300) : "";
    if (Object.prototype.hasOwnProperty.call(body, "isPublic")) data.isPublic = body.isPublic === true;
    if (Object.prototype.hasOwnProperty.call(body, "categoryId")) {
      const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
      if (categoryId && !await prisma.documentCategory.findUnique({ where: { id: categoryId }, select: { id: true } })) {
        return NextResponse.json({ error: "That category no longer exists." }, { status: 400 });
      }
      data.categoryId = categoryId;
    }
    if (!Object.keys(data).length) return NextResponse.json({ error: "No changes were provided." }, { status: 400 });
    const document = await prisma.labDocument.update({ where: { id }, data, include: { category: true } });
    revalidatePath("/database");
    revalidatePath("/members/documents");
    revalidatePath(`/documents/${id}`);
    return NextResponse.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save document changes.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { confirmation?: unknown };
    if (body.confirmation !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
    const document = await prisma.labDocument.findUnique({ where: { id }, select: { driveFileId: true } });
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    try { await deleteDriveDocument(document.driveFileId); } catch (error) { console.warn(`Could not delete Drive file ${document.driveFileId}.`, error); }
    await prisma.labDocument.delete({ where: { id } });
    revalidatePath("/database");
    revalidatePath("/members/documents");
    revalidatePath("/members/notifications");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete document.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}
