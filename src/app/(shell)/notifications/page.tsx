// src/app/notifications/page.tsx
import { redirect } from "next/navigation";
import { MarkReadButton } from "@/components/MarkReadButton";
import { MarkAllReadButton } from "@/components/MarkAllReadButton";
import { ClearAllButton } from "@/components/ClearAllButton";
import { getSessionViewer } from "@/server/session";
import { listNotificationsForUser } from "@/server/services/notifications";

export default async function NotificationsPage() {
  const { userId } = await getSessionViewer();
  if (!userId) redirect("/login");

  const { items } = await listNotificationsForUser({
    userId,
    limit: 50,
    cursor: null,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <div className="flex items-center gap-2">
          <MarkAllReadButton />
          <ClearAllButton />
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-muted-foreground">No notifications yet.</div>
      )}

      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className="flex items-center justify-between rounded-xl border p-3"
          >
            <div>
              <div className="font-medium">{n.title}</div>
              <div className="text-xs text-muted-foreground">
                {n.subtitle || `${n.targetType}:${n.targetId}`} •{" "}
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
