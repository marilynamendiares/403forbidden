// src/app/world/systems/page.tsx
import Link from "next/link";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function WorldSystemsPage() {
  return (
    <div className="space-y-6">
      <div>
        <BackButton fallbackHref="/world" className="text-sm opacity-70 hover:underline" label="← Back" />

        <h1 className="text-2xl font-semibold mt-2">Systems</h1>
        <p className="text-sm opacity-70 mt-1">
          Protocols, rules, mechanics. Read-only.
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href="/world/systems/rules"
          className="border border-neutral-800 rounded-2xl p-5 hover:bg-neutral-950 transition"
        >
          <div className="text-sm font-semibold">Rules</div>
          <p className="text-sm opacity-70 mt-1">Boundaries, etiquette, posting rules.</p>
        </Link>

        <Link
          href="/world/systems/mechanics"
          className="border border-neutral-800 rounded-2xl p-5 hover:bg-neutral-950 transition"
        >
          <div className="text-sm font-semibold">Mechanics</div>
          <p className="text-sm opacity-70 mt-1">Game systems, economy, collaboration rules.</p>
        </Link>

        <Link
          href="/world/systems/faq"
          className="border border-neutral-800 rounded-2xl p-5 hover:bg-neutral-950 transition"
        >
          <div className="text-sm font-semibold">FAQ</div>
          <p className="text-sm opacity-70 mt-1">Common questions and quick answers.</p>
        </Link>
      </div>
    </div>
  );
}
