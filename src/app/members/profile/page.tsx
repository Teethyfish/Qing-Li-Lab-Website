// src/app/members/profile/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";            // ✅ correct import
import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email as string | undefined;
  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { email: true, name: true, about: true },
  });

  // ---- server actions ----
  async function updateNameAction(formData: FormData) {
    "use server";
    const s = await getServerSession(authOptions);
    const e = s?.user?.email;
    if (!e) redirect("/login");

    const newName = String(formData.get("name") || "").trim();
    await prisma.user.update({
      where: { email: e.toLowerCase() },
      data: { name: newName || null },
    });
    revalidatePath("/members/profile");
  }

  async function updateAboutAction(formData: FormData) {
    "use server";
    const s = await getServerSession(authOptions);
    const e = s?.user?.email;
    if (!e) redirect("/login");

    const newAbout = String(formData.get("about") || "").trim();
    await prisma.user.update({
      where: { email: e.toLowerCase() },
      data: { about: newAbout || null },
    });
    revalidatePath("/members/profile");
  }

  return (
    <main className="max-w-2xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Edit Your Profile</h1>
        <p className="text-gray-600">
          Update your display name and “About Me”. Your email cannot be changed.
        </p>
        <p className="text-sm text-gray-500">
          <b>Email:</b> {user?.email}
        </p>
      </header>

      {/* Display Name card */}
      <section className="rounded border p-5 bg-white shadow-sm space-y-3">
        <h2 className="font-semibold text-lg">Display Name</h2>
        <p className="text-sm text-gray-600">
          This name appears on your profile and member lists.
        </p>
        <form action={updateNameAction} className="space-y-3">
          <input
            name="name"
            defaultValue={user?.name ?? ""}
            placeholder="e.g., Lynn Zhang"
            className="w-full border rounded p-2 outline-none focus:ring focus:ring-blue-200"
          />
          <button className="px-4 py-2 rounded bg-blue-600 text-white">
            Save Name
          </button>
        </form>
      </section>

      {/* About Me card */}
      <section className="rounded border p-5 bg-white shadow-sm space-y-3">
        <h2 className="font-semibold text-lg">About Me</h2>
        <p className="text-sm text-gray-600">
          A short bio or research interests (markdown/plain text).
        </p>
        <form action={updateAboutAction} className="space-y-3">
          <textarea
            name="about"
            rows={5}
            defaultValue={user?.about ?? ""}
            placeholder="Write a brief intro…"
            className="w-full border rounded p-2 outline-none focus:ring focus:ring-blue-200"
          />
          <button className="px-4 py-2 rounded bg-blue-600 text-white">
            Save About
          </button>
        </form>
      </section>
    </main>
  );
}
