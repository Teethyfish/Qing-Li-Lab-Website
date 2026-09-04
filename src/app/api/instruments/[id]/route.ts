import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = await request.json() as { isAvailable?: unknown };
    if (typeof body.isAvailable !== "boolean") {
      return NextResponse.json({ error: "Availability must be true or false." }, { status: 400 });
    }
    const instrument = await prisma.instrument.update({
      where: { id },
      data: { isAvailable: body.isAvailable },
    });
    return NextResponse.json({ instrument });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update instrument.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  try {
    await requireAdminUser();
    const { id } = await params;
    await prisma.instrument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete instrument.";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 500 });
  }
}
