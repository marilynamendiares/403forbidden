"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";

export default function HeaderClient() {
  const { data } = useSession();
  const pathname = usePathname();
  const search = useSearchParams();
  const here = pathname + (search.size ? `?${search.toString()}` : "");

  const handleSignIn = () => {
    const url = new URL("/login", window.location.origin);
    url.searchParams.set("next", here || "/");
    window.location.href = url.toString();
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    const url = new URL("/login", window.location.origin);
    url.searchParams.set("next", here || "/");
    window.location.href = url.toString();
  };

  return (
    <div className="flex items-center gap-4">
      {/* Кнопка перехода на форум */}
      <Link
        href="/forum"
        className="rounded bg-neutral-900 px-3 py-1 text-sm opacity-80 hover:opacity-100 transition"
      >
        Forum
      </Link>

      {/* Если авторизован — показываем email и выход */}
      {data?.user ? (
        <>
          <span className="text-sm opacity-70">{data.user.email}</span>
          <button
            onClick={handleSignOut}
            className="rounded bg-neutral-800 px-3 py-1"
          >
            Sign out
          </button>
        </>
      ) : (
        <button
          onClick={handleSignIn}
          className="rounded bg-neutral-800 px-3 py-1"
        >
          Sign in
        </button>
      )}
    </div>
  );
}
