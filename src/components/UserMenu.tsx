// src/components/UserMenu.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AvatarImg from "@/components/avatarImg";
import NoiseOverlay from "@/components/noise/NoiseOverlay";
import { markNotificationRead } from "@/lib/notificationActions";
import {
  emitNotificationUnread,
} from "@/lib/notificationUnreadEvents";
import {
  useNotificationsFeed,
  type NotificationItem,
} from "@/hooks/useNotificationsFeed";
import { useClickOutside } from "@/hooks/useClickOutside";

type Props = {
  username: string;
  avatarUrl?: string | null;
  notifCount?: number;
  variant?: "default" | "topbar";
};

function formatTime(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNotifCount(count: number) {
  return count > 99 ? "99+" : count;
}

function UserMenuNotificationItem({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: (item: NotificationItem) => void;
}) {
  return (
    <li
      className={`flex flex-col gap-0.5 px-3 py-2 text-sm ${item.isRead ? "opacity-70" : "bg-white/5"}`}
    >
      <button type="button" onClick={() => onClick(item)} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{item.title || "Notification"}</span>
          {!item.isRead && <span className="ml-2 h-2 w-2 rounded-full bg-red-500" />}
        </div>

        {item.subtitle && (
          <div className="truncate text-[11px] text-neutral-300">
            {item.subtitle}
          </div>
        )}

        <div className="mt-0.5 text-[11px] text-neutral-500">{formatTime(item.createdAt)}</div>
      </button>
    </li>
  );
}

function UserMenuNotificationSection({
  notifLoading,
  notifItems,
  hasMore,
  onClickItem,
  onViewAll,
}: {
  notifLoading: boolean;
  notifItems: NotificationItem[];
  hasMore: boolean;
  onClickItem: (item: NotificationItem) => void;
  onViewAll: () => void;
}) {
  return (
    <div className="border-t border-white/10">
      <div className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wide text-neutral-400">
        Latest
      </div>

      {notifLoading && notifItems.length === 0 && (
        <div className="px-3 py-2 text-xs text-neutral-500">Loading notifications…</div>
      )}

      {!notifLoading && notifItems.length === 0 && (
        <div className="px-3 py-2 text-xs text-neutral-500">No recent notifications.</div>
      )}

      {notifItems.length > 0 && (
        <ul className="max-h-64 overflow-y-auto">
          {notifItems.map((item) => (
            <UserMenuNotificationItem key={item.id} item={item} onClick={onClickItem} />
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:bg-white/5"
          onClick={onViewAll}
        >
          View all notifications →
        </button>
      )}
    </div>
  );
}

export default function UserMenu({
  username,
  avatarUrl,
  notifCount = 0,
  variant = "default",
}: Props) {
  const topbar = variant === "topbar";

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    items: notifItems,
    loading: notifLoading,
    refresh: refreshNotifFeed,
    hasMore,
  } = useNotificationsFeed(5, open);

  useClickOutside(ref, open, () => setOpen(false));

  // при открытии меню подтягиваем список, но не чаще чем раз в 60с
  const lastFeedSyncRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    const now = Date.now();
    if (now - lastFeedSyncRef.current < 60_000) return;

    lastFeedSyncRef.current = now;
    refreshNotifFeed();
  }, [open, refreshNotifFeed]);

  const handleSignOut = () => {
    void signOut();
  };

  const linkClassActive = (isActive?: boolean) =>
    `flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 ${
      isActive ? "bg-white/5" : ""
    }`;

  // 🟢 клик по уведомлению: mark-one + переход по href
  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.href) return;

    try {
      const result = await markNotificationRead(n.id).catch(() => null);
      if (!result?.ok) {
        emitNotificationUnread({ op: "dec", delta: 1 });
      }
    } catch {}

    setOpen(false);
    router.push(n.href);
  };

  return (
    <div
      ref={ref}
      className={topbar ? "relative h-full w-full" : "relative"}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "relative h-full w-full rounded-none border-0 bg-black/0 outline-none",
          "hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-black/20",
        ].join(" ")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
      >
        <span
          className="relative block h-full w-full overflow-hidden rounded-none"
          style={{ isolation: "isolate" }}
        >
          <AvatarImg
            src={avatarUrl ?? undefined}
            alt={`${username} avatar`}
            className="h-full w-full object-cover"
          />

          <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2]">
            <NoiseOverlay
              className="absolute inset-0 h-full w-full"
              sandOpacity={0.22}
              sparkleOpacity={0.1}
            />
          </span>
        </span>

        {notifCount > 0 && (
          <span
            className="
              absolute -top-2 -right-2 z-20
              inline-flex h-5 min-w-5 items-center justify-center
              rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white
              shadow-md
            "
          >
            {formatNotifCount(notifCount)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={[
            "absolute z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 shadow-lg backdrop-blur",
            topbar ? "left-0" : "right-0",
          ].join(" ")}
        >
          <Link
            href={`/u/${encodeURIComponent(username)}`}
            className="block px-3 py-2 text-sm hover:bg-white/5"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>

          <Link
            href="/notifications"
            className={linkClassActive()}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span>Notifications</span>
            {notifCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                {formatNotifCount(notifCount)}
              </span>
            )}
          </Link>

          <UserMenuNotificationSection
            notifLoading={notifLoading}
            notifItems={notifItems}
            hasMore={hasMore}
            onClickItem={(item) => {
              void handleNotificationClick(item);
            }}
            onViewAll={() => {
              setOpen(false);
              router.push("/notifications");
            }}
          />

          <button
            className="block w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
            role="menuitem"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
