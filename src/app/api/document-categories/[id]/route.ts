import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = await request.json() as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    const duplicate = await prisma.documentCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" }, NOT: { id } } });
    if (duplicate) return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    const category = await prisma.documentCategory.update({ where: { id }, data: { name } });
    revalidatePath("/database");
    revalidatePath("/members/documents");
    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not rename category.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Props) {
  try {
    await requireAdminUser();
    const { id } = await params;
    await prisma.documentCategory.delete({ where: { id } });
    revalidatePath("/database");
    revalidatePath("/members/documents");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete category.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}
