import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/document-access";
import sanitizeHtml from "sanitize-html";

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
    const savePromises = entries.map(([key, value]) => {
      const storedValue = key.startsWith("content:")
        ? JSON.stringify({
            format: "html",
            value: sanitizeHtml(value, {
              allowedTags: ["a", "b", "br", "div", "em", "font", "i", "li", "ol", "p", "s", "span", "strong", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul"],
              allowedAttributes: {
                a: ["href", "title"], font: ["color", "face", "size"], span: ["style"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan", "scope"],
              },
              allowedSchemes: ["http", "https", "mailto"],
              allowedStyles: {
                "*": {
                  color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i],
                  "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i],
                  "font-family": [/^[a-z0-9 ,.'"-]+$/i],
                  "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
                  "text-align": [/^(left|right|center|justify)$/],
                },
              },
            }),
          })
        : JSON.stringify(value);
      return (
      prisma.appConfig.upsert({
        where: { key },
        update: { value: storedValue },
        create: { key, value: storedValue },
      })
      );
    });

    await prisma.$transaction(savePromises);
    revalidatePath("/", "layout");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving content:", error);
    return NextResponse.json({ error: "Failed to save content" }, { status: 500 });
  }
}
