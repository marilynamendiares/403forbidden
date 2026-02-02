// src/components/UserMenu.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useNotificationsFeed,
  type NotificationItem,
} from "@/hooks/useNotificationsFeed";

type Props = {
  username: string;
  avatarUrl?: string | null;
  notifCount?: number;
};

// Просто формат времени для подписи
function formatTime(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserMenu({ username, avatarUrl, notifCount = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    items: notifItems,
    loading: notifLoading,
    refresh: refreshNotifFeed,
    hasMore,
    } = useNotificationsFeed(5, open);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // при открытии меню подтягиваем список, но не чаще чем раз в 60с
  const lastFeedSyncRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    const now = Date.now();
    if (now - lastFeedSyncRef.current < 60_000) return;

    lastFeedSyncRef.current = now;
    refreshNotifFeed();
  }, [open, refreshNotifFeed]);


  // ЛОКАЛЬНАЯ синхронизация бейджа и фида из /notifications (mark read / mark all)
  useEffect(() => {
    const onLocal = (e: Event) => {
      const { detail } = e as CustomEvent<{
        op?: "set" | "inc" | "dec" | "clear";
        count?: number;
        delta?: number;
      }>;
      if (!detail) return;

      // сам бейдж (notifCount) приходит пропсом сверху (HeaderClient),
      // здесь только рефрешим дропдаун, чтобы список соответствовал операциям.
      switch (detail.op) {
        case "set":
        case "inc":
        case "dec":
        case "clear":
          refreshNotifFeed();
          break;
      }
    };

    window.addEventListener("notif:unread", onLocal as EventListener);
    return () =>
      window.removeEventListener("notif:unread", onLocal as EventListener);
  }, [refreshNotifFeed]);

  const handleSignOut = () => {
    void signOut();
  };

  const linkClassActive = (isActive?: boolean) =>
    `flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 ${
      isActive ? "bg-white/5" : ""
    }`;

  // 🟢 клик по уведомлению: mark-one + переход по href
  const handleNotificationClick = async (n: NotificationItem) => {
    // если нет ссылки — просто игнорируем (уведомление purely информативное)
    if (!n.href) return;

    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "mark-one", id: n.id }),
      }).catch(() => {});

      // локальный ивент, чтобы другие места обновили счётчик/фид
      window.dispatchEvent(
        new CustomEvent("notif:unread", {
          detail: { op: "dec", delta: 1 },
        })
      );
    } catch {
      // в худшем случае просто перейдём без обновления счётчика
    }

    setOpen(false);
    router.push(n.href);
  };

  return (
    <div ref={ref} className="relative">
<button
  onClick={() => setOpen((v) => !v)}
  className={[
    "relative",
    "h-10 w-10",
    "rounded-none",
    "bg-white/5 hover:bg-white/10",
    "border border-white/10",
    "outline-none",
    "focus-visible:ring-2 focus-visible:ring-white/25",
  ].join(" ")}
  aria-haspopup="menu"
  aria-expanded={open}
  aria-label="Open user menu"
>
  {/* КЛИП ДЛЯ КАРТИНКИ — внутри, чтобы бейдж не обрезался */}
  <span className="block h-full w-full overflow-hidden rounded-none">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={avatarUrl || "/default-avatar.svg"}
      alt=""
      className="h-full w-full object-cover"
    />
  </span>

  {notifCount > 0 && (
    <span
      className="
        absolute -top-2 -right-2 z-20
        inline-flex h-5 min-w-5 items-center justify-center
        rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white
        shadow-md
      "
      aria-label={`${notifCount} unread notifications`}
      title={`${notifCount} unread notifications`}
    >
      {notifCount > 99 ? "99+" : notifCount}
    </span>
  )}
</button>



      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 backdrop-blur shadow-lg"
        >
          {/* верхние пункты меню */}
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
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </Link>

          {/* мини-лента последних уведомлений */}
          <div className="border-t border-white/10">
            <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-neutral-400">
              Latest
            </div>

            {notifLoading && notifItems.length === 0 && (
              <div className="px-3 py-2 text-xs text-neutral-500">
                Loading notifications…
              </div>
            )}

            {!notifLoading && notifItems.length === 0 && (
              <div className="px-3 py-2 text-xs text-neutral-500">
                No recent notifications.
              </div>
            )}

            {notifItems.length > 0 && (
              <ul className="max-h-64 overflow-y-auto">
                {notifItems.map((n) => (
                  <li
                    key={n.id}
                    className={`px-3 py-2 text-sm flex flex-col gap-0.5 ${
                      n.isRead ? "opacity-70" : "bg-white/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(n)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {/* 🟢 title приходит уже из бэка, читаемый текст типа "Новый пост!" */}
                          {n.title || "Notification"}
                        </span>
                        {!n.isRead && (
                          <span className="ml-2 h-2 w-2 rounded-full bg-red-500" />
                        )}
                      </div>

                      {/* Subtitle: "Глава 'X' — книга 'Y'" или просто "Глава 'X'" */}
                      {n.subtitle && (
                        <div className="text-[11px] text-neutral-300 truncate">
                          {n.subtitle}
                        </div>
                      )}

                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {formatTime(n.createdAt)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <button
                className="w-full px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 text-left"
                onClick={() => {
                  window.location.href = "/notifications";
                }}
              >
                View all notifications →
              </button>
            )}
          </div>

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
