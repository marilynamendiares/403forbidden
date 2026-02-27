// src/app/HeaderClient.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import UserMenu from "@/components/UserMenu";
import { useEventStream } from "@/features/realtime/client/useEventStream";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

type MeProfile = { username: string; avatarUrl: string | null };

export default function HeaderClient({
  sseEventName,
  variant,
}: {
  sseEventName?: string;
  variant?: "topbar" | "default";
}) {
  const { status } = useSession();
  const pathname = usePathname();
  const search = useSearchParams();
  const here = pathname + (search.size ? `?${search.toString()}` : "");

  const [me, setMe] = useState<MeProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { count: unread, setLocal, incLocal, decLocal, sync } = useUnreadNotifications();

  useEffect(() => {
    if (!hydrated || status !== "authenticated") return;
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, status]);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;

    if (status === "unauthenticated") {
      setMe(null);
      return;
    }
    if (status !== "authenticated") return;

    let abort = false;
    (async () => {
      try {
        const r = await fetch("/api/profile", { cache: "no-store" });
        if (!r.ok) return;
        const p = await r.json();
        if (!abort) setMe({ username: p.username, avatarUrl: p.avatarUrl ?? null });
      } catch {}
    })();

    return () => {
      abort = true;
    };
  }, [hydrated, status]);

  useEventStream(
    sseEventName
      ? {
          [sseEventName]: (msg: any) => {
            const t: string | undefined = msg?.type || msg?.event || msg?.topic || msg?.name;
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
    return () => window.removeEventListener("notif:unread", onLocal as EventListener);
  }, []);

  const handleSignIn = () => {
    const url = new URL("/login", window.location.origin);
    url.searchParams.set("next", here || "/");
    window.location.href = url.toString();
  };

  const shouldShowSkeleton = !hydrated || (!me && (status === "loading" || status === "authenticated"));

return (
  <div
    className="relative h-18 w-18 overflow-visible"
    style={{ isolation: "isolate" }}
  >
    {shouldShowSkeleton ? (
      <div className="h-full w-full bg-black/10 animate-pulse" />
    ) : status === "authenticated" && me ? (
      <UserMenu
        username={me.username}
        avatarUrl={me.avatarUrl}
        notifCount={unread}
        variant="topbar"
      />
    ) : (
      <button
        onClick={handleSignIn}
        className="h-full w-full text-sm text-black/80 hover:bg-black/5 transition"
        style={{ background: "transparent" }}
      >
        Sign in
      </button>
    )}
  </div>
);
}
