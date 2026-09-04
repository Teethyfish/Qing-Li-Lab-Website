import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/document-access";

export default async function MyProfileSettingsPage() {
  const user = await getCurrentUser();
  if (!user?.isActive) redirect("/login");
  redirect(`/members/profile/${user.id}`);
}
