import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_LENGTH = 2_000_000;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await request.json() as Record<string, unknown>;
    const name = text(body.name, 160);
    const description = text(body.description, 5_000);
    const location = text(body.location, 300);
    const imageUrl = text(body.imageUrl, MAX_IMAGE_LENGTH);

    if (!name || !description || !location || !imageUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Name, image, description, and location are required." }, { status: 400 });
    }
    if (imageUrl.length >= MAX_IMAGE_LENGTH) {
      return NextResponse.json({ error: "The instrument image is too large." }, { status: 413 });
    }

    const instrument = await prisma.instrument.create({
      data: { name, description, location, imageUrl, isAvailable: body.isAvailable !== false },
    });
    return NextResponse.json({ instrument }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add instrument.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}
