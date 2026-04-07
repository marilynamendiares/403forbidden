"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/characters", label: "Characters" },
  { href: "/admin/wallet", label: "Wallet" },
  { href: "/admin/shop", label: "Shop" },
] as const;

export default function AdminNav({ currentPath }: { currentPath: string }) {
  const pathname = usePathname();
  const activePath = pathname || currentPath;

  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-neutral-900 bg-neutral-950/30 p-2">
      {LINKS.map((link) => {
        const active =
          activePath === link.href ||
          (link.href !== "/admin" && activePath.startsWith(`${link.href}/`));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? "border-neutral-700 bg-neutral-900 text-white"
                : "border-neutral-900 bg-neutral-950/40 text-neutral-300 hover:border-neutral-800 hover:bg-neutral-900/60"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
