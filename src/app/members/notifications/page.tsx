export const runtime = "nodejs";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/document-access";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  async function openNotification(formData: FormData) {
    "use server";
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/login");
    const id = String(formData.get("id") || "");
    const notification = await prisma.notification.findFirst({
      where: { id, userId: currentUser.id },
    });
    if (!notification) return;
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    redirect(notification.href.startsWith("/") ? notification.href : "/members/notifications");
  }

  async function markAllRead() {
    "use server";
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/login");
    await prisma.notification.updateMany({
      where: { userId: currentUser.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/members/notifications");
  }

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "end" }}>
        <div>
          <h1>Notifications</h1>
          <p className="muted">Documents and updates sent to your lab account.</p>
        </div>
        {notifications.some((notification) => !notification.readAt) ? (
          <form action={markAllRead}><button className="btn btn-muted">Mark all read</button></form>
        ) : null}
      </header>

      <section style={{ display: "grid", gap: "1rem" }}>
        {notifications.length === 0 ? <p className="muted">You have no notifications.</p> : null}
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className="tile"
            style={{ borderLeft: notification.readAt ? undefined : "4px solid var(--color-text)" }}
          >
            <h2 style={{ marginTop: 0 }}>{notification.title}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{notification.message}</p>
            <p className="muted">{notification.createdAt.toLocaleString()}</p>
            <form action={openNotification}>
              <input type="hidden" name="id" value={notification.id} />
              <button className="btn btn-basic" type="submit">Open</button>
            </form>
          </article>
        ))}
      </section>
    </main>
  );
}
