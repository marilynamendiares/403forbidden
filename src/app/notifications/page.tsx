// src/app/notifications/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { MarkReadButton } from "@/components/MarkReadButton";
import { MarkAllReadButton } from "@/components/MarkAllReadButton";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) redirect("/login");

  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      type: true,
      targetType: true,
      targetId: true,
      isRead: true,
      createdAt: true,
      payload: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <MarkAllReadButton />
      </div>

      {items.length === 0 && (
        <div className="text-muted-foreground">No notifications yet.</div>
      )}

      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className="border rounded-xl p-3 flex items-center justify-between"
          >
            <div>
              <div className="font-medium">{n.type}</div>
              <div className="text-xs text-muted-foreground">
                {n.targetType}:{n.targetId} •{" "}
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
            {!n.isRead && <MarkReadButton id={n.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
