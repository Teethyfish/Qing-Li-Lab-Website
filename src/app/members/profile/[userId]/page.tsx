import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/document-access";
import { publicProfileFromUnknown } from "@/lib/public-profile";
import { prisma } from "@/lib/prisma";
import ProfileBuilder from "../ProfileBuilder";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ userId: string }> };

export default async function ProfileSettingsPage({ params }: Props) {
  const editor = await getCurrentUser();
  const t = await getTranslations("sitePages.profile");
  if (!editor?.isActive) redirect("/login");
  const { userId } = await params;
  if (editor.id !== userId && editor.role !== "ADMIN") redirect("/members/profile");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, about: true, imageUrl: true, slug: true, profileContent: true },
  });
  if (!user) notFound();

  return <main style={{ display: "grid", gap: "1.5rem" }}>
    <header>
      <h1>{editor.id === user.id ? t("editYours") : t("editMember", { name: user.name || user.email })}</h1>
      <p className="muted">{t("editorSubtitle")}</p>
    </header>
    <ProfileBuilder
      user={{ ...user, profileContent: publicProfileFromUnknown(user.profileContent, user.email) }}
      isAdminEditing={editor.id !== user.id}
    />
  </main>;
}
