"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/document-access";
import { deleteDriveDocument } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export async function deleteDocumentEntry(formData: FormData) {
  await requireAdminUser();

  const id = String(formData.get("id") || "");
  const typedConfirmation = formData.get("confirmation");
  if (!id || (typedConfirmation !== null && typedConfirmation !== "DELETE")) return;

  const document = await prisma.labDocument.findUnique({
    where: { id },
    select: { driveFileId: true },
  });
  if (!document) return;

  // Drive cleanup is best-effort. An administrator must still be able to
  // remove a stale website entry when the file was deleted directly in Drive.
  try {
    await deleteDriveDocument(document.driveFileId);
  } catch (error) {
    console.warn(`Could not delete Drive file for document ${id}; removing the website entry anyway.`, error);
  }

  await prisma.labDocument.deleteMany({ where: { id } });

  revalidatePath("/database");
  revalidatePath("/members/documents");
  revalidatePath("/members/notifications");
}
