// src/app/HeaderClient.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import UserMenu from "@/components/UserMenu";
import { useEventStream } from "@/hooks/useEventStream";

type MeProfile = { username: string; avatarUrl: string | null };

export default function HeaderClient({ sseEventName }: { sseEventName?: string }) {
  const { data: session, status } = useSession(); // 👈 берём status
  const pathname = usePathname();
  const search = useSearchParams();
  const here = pathname + (search.size ? `?${search.toString()}` : "");

  const [me, setMe] = useState<MeProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [unread, setUnread] = useState<number>(0);

  // стабильная верстка между SSR/CSR
  useEffect(() => setHydrated(true), []);

  // загрузка профиля после монтирования / смены статуса
  useEffect(() => {
    if (!hydrated) return;

    // если явно разлогинен — чистим профиль
    if (status === "unauthenticated") {
      setMe(null);
      return;
    }

    // статус "loading" — просто ждём, НЕ трогаем me и НЕ дергаем /api/profile
    if (status !== "authenticated") {
      return;
    }

    // здесь status === "authenticated" — можно подтягивать профиль
    let abort = false;
    (async () => {
      try {
        const r = await fetch("/api/profile", { cache: "no-store" });
        if (!r.ok) return;
        const p = await r.json();
        if (!abort) {
          setMe({
            username: p.username,
            avatarUrl: p.avatarUrl || "/default-avatar.svg",
          });
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      abort = true;
    };
  }, [hydrated, status]);


  // helper: подтянуть актуальный счётчик непрочитанных
  const refetchUnread = async () => {
    try {
      const r = await fetch("/api/notifications?unread=1", { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as { count?: number };
      if (typeof data.count === "number") setUnread(data.count);
    } catch {
      /* ignore */
    }
  };

  // первичная загрузка + на смену маршрута
  useEffect(() => {
    if (!hydrated || status !== "authenticated") return;
    refetchUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, status, pathname]);

  // при возвращении фокуса/вкладки — тоже актуализируем
  useEffect(() => {
    if (!hydrated || status !== "authenticated") return;
    const onFocus = () => refetchUnread();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [hydrated, status]);

  // SSE
  useEventStream(
    sseEventName
      ? {
          [sseEventName]: (msg: any) => {
            const t: string | undefined =
              msg?.type || msg?.event || msg?.topic || msg?.name;

            if (
              t === "chapter.published" ||
              t === "chapter:new_post" ||
              (typeof t === "string" &&
                (t.startsWith("notification:") || t.startsWith("notify:")))
            ) {
              setUnread((x) => x + 1);
              return;
            }

            if (t === "notifications:read_all") {
              setUnread(0);
              return;
            }
            if (t === "notification:read_one" || t === "notification:mark_read") {
              setUnread((x) => Math.max(0, x - 1));
              return;
            }
          },
        }
      : {}
  );

  // локальная синхронизация бейджа
  useEffect(() => {
    const onLocal = (e: Event) => {
      const { detail } = e as CustomEvent<{
        op?: "set" | "inc" | "dec" | "clear";
        count?: number;
        delta?: number;
      }>;
      if (!detail) return;

      switch (detail.op) {
        case "set":
          setUnread(Math.max(0, Number(detail.count ?? 0)));
          break;
        case "inc":
          setUnread((x) => x + Number(detail.delta ?? 1));
          break;
        case "dec":
          setUnread((x) => Math.max(0, x - Number(detail.delta ?? 1)));
          break;
        case "clear":
          setUnread(0);
          break;
      }
    };

    window.addEventListener("notif:unread", onLocal as EventListener);
    return () =>
      window.removeEventListener("notif:unread", onLocal as EventListener);
  }, []);

  const handleSignIn = () => {
    const url = new URL("/login", window.location.origin);
    url.searchParams.set("next", here || "/");
    window.location.href = url.toString();
  };

  const linkClass = (path: string) =>
    `rounded px-3 py-1 text-sm transition ${
      pathname.startsWith(path)
        ? "bg-white/10 opacity-100"
        : "bg-neutral-900 opacity-80 hover:opacity-100"
    }`;

  // ─────────── UI: решаем, что показывать справа ───────────
  const shouldShowSkeleton =
    !hydrated || (!me && (status === "loading" || status === "authenticated"));


return (
  <div className="min-w-36 flex justify-end">
    {shouldShowSkeleton ? (
      <div className="h-8 w-36 rounded bg-neutral-900/50 animate-pulse" />
    ) : status === "authenticated" && me ? (
      <UserMenu username={me.username} avatarUrl={me.avatarUrl} notifCount={unread} />
    ) : (
      <button
        onClick={handleSignIn}
        className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700 transition"
      >
        Sign in
      </button>
    )}
  </div>
);

}
