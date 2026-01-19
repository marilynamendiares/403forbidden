// src/app/archive/systems/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ArchiveSystemsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm opacity-70 hover:underline" href="/archive">
          ← Back to Archive
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Systems</h1>
        <p className="text-sm opacity-70 mt-1">
          Protocols, rules, mechanics. Read-only.
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href="/forum/rules"
          className="border border-neutral-800 rounded-2xl p-5 hover:bg-neutral-950 transition"
        >
          <div className="text-sm font-semibold">Rules / Mechanics / FAQ</div>
          <p className="text-sm opacity-70 mt-1">
            Rules and how-to.
          </p>
        </Link>

        <div className="border border-neutral-800 rounded-2xl p-5 opacity-70">
          <div className="text-sm font-semibold">Mechanics</div>
          <p className="text-sm mt-1">
            Coming next: structured docs (not threads).
          </p>
        </div>

        <div className="border border-neutral-800 rounded-2xl p-5 opacity-70">
          <div className="text-sm font-semibold">FAQ</div>
          <p className="text-sm mt-1">
            Coming next: searchable help articles.
          </p>
        </div>
      </div>
    </div>
  );
}
