import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function slugify(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "category";
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
    const body = await request.json() as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    const duplicate = await prisma.documentCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    if (duplicate) return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    const category = await prisma.documentCategory.create({ data: { name, slug: `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}` } });
    revalidatePath("/database");
    revalidatePath("/members/documents");
    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create category.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}
