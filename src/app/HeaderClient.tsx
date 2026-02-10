// src/app/HeaderClient.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import UserMenu from "@/components/UserMenu";
import { useEventStream } from "@/hooks/useEventStream";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { resolveMediaUrl } from "@/lib/media";


type MeProfile = { username: string; avatarUrl: string | null };

export default function HeaderClient({ sseEventName }: { sseEventName?: string }) {
  const { data: session, status } = useSession(); // 👈 берём status
  const pathname = usePathname();
  const search = useSearchParams();
  const here = pathname + (search.size ? `?${search.toString()}` : "");

  const [me, setMe] = useState<MeProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { count: unread, setLocal, incLocal, decLocal, sync } = useUnreadNotifications();

  // На логине делаем один sync, дальше живём от SSE + редкий refreshInterval из хука
  useEffect(() => {
    if (!hydrated || status !== "authenticated") return;
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, status]);


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
  avatarUrl: resolveMediaUrl(p.avatarUrl) ?? "/default-avatar.svg",
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

  // SSE
  useEventStream(
    sseEventName
      ? {
          [sseEventName]: (msg: any) => {
            const t: string | undefined =
              msg?.type || msg?.event || msg?.topic || msg?.name;

            // Увеличиваем только на реальных notification-событиях
            if (typeof t === "string" && (t.startsWith("notification:") || t.startsWith("notify:"))) {
              incLocal(1);
              return;
            }

            if (t === "notifications:read_all") {
              setLocal(0);
              return;
            }

            if (t === "notification:read_one" || t === "notification:mark_read") {
              decLocal(1);
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
          setLocal(Number(detail.count ?? 0));
          break;
        case "inc":
          incLocal(Number(detail.delta ?? 1));
          break;
        case "dec":
          decLocal(Number(detail.delta ?? 1));
          break;
        case "clear":
          setLocal(0);
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
  <div className="flex justify-end pt-3">
    {shouldShowSkeleton ? (
      <div className="h-10 w-10 bg-neutral-900/50 animate-pulse" />
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
