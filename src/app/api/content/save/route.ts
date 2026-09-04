import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/document-access";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.isActive || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { editedContent } = body as { editedContent: Record<string, string> };

    if (!editedContent || typeof editedContent !== "object") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const entries = Object.entries(editedContent);
    if (entries.length > 250) {
      return NextResponse.json({ error: "Too many changes in one save" }, { status: 400 });
    }

    for (const [key, value] of entries) {
      const validKey = key.startsWith("content:") || key.startsWith("home.");
      if (!validKey || typeof value !== "string" || value.length > 20_000) {
        return NextResponse.json({ error: "Invalid page content" }, { status: 400 });
      }
    }

    // AppConfig is persistent Supabase storage. A transaction prevents the UI
    // from reporting success if only part of a multi-field save completes.
    const savePromises = entries.map(([key, value]) =>
      prisma.appConfig.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      })
    );

    await prisma.$transaction(savePromises);
    revalidatePath("/", "layout");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving content:", error);
    return NextResponse.json({ error: "Failed to save content" }, { status: 500 });
  }
}
