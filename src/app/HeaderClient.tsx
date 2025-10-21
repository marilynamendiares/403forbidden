"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";

export default function HeaderClient() {
  const { data } = useSession();
  const pathname = usePathname();
  const search = useSearchParams();
  const here = pathname + (search.size ? `?${search.toString()}` : "");

  if (data?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm opacity-70">{data.user.email}</span>
        <button
          className="rounded bg-neutral-800 px-3 py-1"
          onClick={async () => {
            // Выходим без редиректа со стороны next-auth…
            await signOut({ redirect: false });
            // …и сами ведём на /login с параметром next
            const url = new URL("/login", window.location.origin);
            url.searchParams.set("next", here || "/");
            window.location.href = url.toString();
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  // Незалогинен: ведём на нашу страницу логина, без signIn()
  return (
    <button
      className="rounded bg-neutral-800 px-3 py-1"
      onClick={() => {
        const url = new URL("/login", window.location.origin);
        url.searchParams.set("next", here || "/");
        window.location.href = url.toString();
      }}
    >
      Sign in
    </button>
  );
}
