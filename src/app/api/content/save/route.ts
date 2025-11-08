import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Only admins and PIs can save content
    if (!role || (role.toUpperCase() !== "ADMIN" && role.toUpperCase() !== "PI")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { editedContent } = body as { editedContent: Record<string, string> };

    if (!editedContent || typeof editedContent !== "object") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Save each edited content item to AppConfig
    const savePromises = Object.entries(editedContent).map(([key, value]) =>
      prisma.appConfig.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      })
    );

    await Promise.all(savePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving content:", error);
    return NextResponse.json({ error: "Failed to save content" }, { status: 500 });
  }
}
