// src/app/HeaderClient.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import UserMenu from "@/components/UserMenu";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import { useMyProfile } from "@/hooks/useMyProfile";

export default function HeaderClient({
  sseEventName,
  variant = "default",
}: {
  sseEventName?: string;
  variant?: "topbar" | "default";
}) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const here = pathname + (search.size ? `?${search.toString()}` : "");

  const [hydrated, setHydrated] = useState(false);
  const { profile } = useMyProfile(hydrated && status === "authenticated");
  const isAuthenticated = status === "authenticated";
  const { count: unread } = useNotificationBadge({
    sseEventName,
    enabled: hydrated && isAuthenticated,
    syncOnMount: true,
  });

  useEffect(() => setHydrated(true), []);

  const handleSignIn = () => {
    const next = encodeURIComponent(here || "/");
    router.push(`/login?next=${next}`);
  };

  const shouldShowSkeleton =
    !hydrated || (!profile && (status === "loading" || isAuthenticated));

  return (
    <div
      className="relative h-18 w-18 overflow-visible"
      style={{ isolation: "isolate" }}
    >
      {shouldShowSkeleton ? (
        <div className="h-full w-full bg-black/10 animate-pulse" />
      ) : isAuthenticated && profile ? (
        <UserMenu
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          notifCount={unread}
          variant={variant}
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
