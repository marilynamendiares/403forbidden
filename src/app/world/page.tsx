// src/app/archive/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getSessionUserId } from "@/server/sessionUserId";
import { isPlayer } from "@/server/player";

export const dynamic = "force-dynamic";

function SectionTitle({
  code,
  title,
  right,
}: {
  code: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-60">
          {code}
        </div>
        <h2 className="text-lg font-semibold mt-2">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function Card({
  href,
  label,
  desc,
  meta,
  locked,
  className,
}: {
  href?: string;
  label: string;
  desc: string;
  meta?: string;
  locked?: boolean;
  className?: string;
}) {
const base =
  "h-full border border-white/10 rounded-2xl p-5 bg-white/[0.02] hover:bg-white/[0.04] transition";
  const inner = (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm font-semibold">{label}</div>
        {meta && (
          <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
            {meta}
          </div>
        )}
      </div>
      <p className="text-sm opacity-70">{desc}</p>
      {locked && (
        <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
          ACCESS RESTRICTED
        </div>
      )}
    </div>
  );

  if (!href || locked) {
    return (
  <div className={[base, locked ? "opacity-70" : "", className ?? ""].join(" ")}>
    {inner}
  </div>
);
  }

return (
  <Link href={href} className={[base, className ?? ""].join(" ")}>
    {inner}
  </Link>
);
}

function BigCard({
  href,
  label,
  desc,
  right,
  ctaLabel = "EXPLORE",
}: {
  href: string;
  label: string;
  desc: string;
  right?: React.ReactNode;
  ctaLabel?: string;
}) {
  return (
    <div className="group border border-white/10 rounded-2xl p-6 bg-white/2 hover:bg-white/4 transition">
      
<div className="flex items-start justify-between gap-8">
  {/* LEFT — CTA */}
  <Link
    href={href}
    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-[0.22em] bg-white text-neutral-900 hover:bg-white/90 transition"
  >
    {ctaLabel}
    <span aria-hidden>→</span>
  </Link>

  {/* RIGHT — TITLE + DESC (anchored to the right edge) */}
  <div className="min-w-0 text-right max-w-[520px] ml-auto">
    <div className="text-xl font-semibold">{label}</div>
    <p className="text-sm opacity-70 mt-2">{desc}</p>
  </div>
</div>

      {right && <div className="mt-5">{right}</div>}
    </div>
  );
}


function QuickLinks({
  items,
}: {
  items: Array<{ href?: string; label: string; desc?: string; disabled?: boolean }>;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
        QUICK LINKS
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((x) =>
          x.disabled || !x.href ? (
            <div
              key={x.label}
              className="border border-white/10 rounded-xl p-4 bg-white/1.5 opacity-40 cursor-not-allowed"
            >
              <div className="text-sm font-semibold">{x.label}</div>
              {x.desc && <div className="text-sm opacity-60 mt-1">{x.desc}</div>}
            </div>
          ) : (
            <Link
              key={`${x.href}:${x.label}`}
              href={x.href}
              className="border border-white/10 rounded-xl p-4 bg-white/1.5 hover:bg-white/3 transition"
            >
              <div className="text-sm font-semibold">{x.label}</div>
              {x.desc && <div className="text-sm opacity-70 mt-1">{x.desc}</div>}
            </Link>
          )
        )}
      </div>
    </div>
  );
}

export default async function ArchiveIndexPage() {
  const session = await getServerSession(authOptions);
  const me = getSessionUserId(session);
  const player = me ? await isPlayer(me) : false;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Archive</h1>
          <p className="text-sm opacity-70 mt-1">
            Read-only knowledge base. Canon, broadcasts, protocols.
          </p>
        </div>
        <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-60">
          ACCESS: READ
        </div>
      </div>

      {/* NEWS */}
      <section className="space-y-4">
<div className="flex items-center justify-between">
  <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-60">
    NEWS
  </div>

  <Link
    href="/archive/news"
    className="text-sm opacity-70 hover:underline"
  >
    All broadcasts →
  </Link>
</div>


<div className="grid md:grid-cols-2 gap-3 auto-rows-fr">
  <Card
    className="md:row-span-2"
    href="/archive/news/public"
    label="Announcements (Public)"
    desc="Official updates, bulletins, announcements."
    meta="PUBLIC"
  />

  <Card
    href={player ? "/archive/news/players" : undefined}
    locked={!player}
    label="Announcements (Players)"
    desc="Players-only updates and internal notices."
    meta="PLAYERS"
  />

  <Card
    href="/archive/news/devlog"
    label="Developer Changelog"
    desc="Patch notes and platform updates."
    meta="DEVLOG"
  />
</div>

      </section>

      {/* WORLD */}
      <section className="space-y-4">
<div className="text-xs font-mono uppercase tracking-[0.22em] opacity-60">
  WORLD
</div>

<BigCard
  href="/archive/world"
  label="World"
  desc="Canon, lore, factions, locations, and the city’s structure."
  ctaLabel="EXPLORE WORLD"
  right={
<QuickLinks
  items={[
    { href: "/archive/world/lore", label: "Lore", desc: "Canon & fragments" },
    { href: "/archive/world/timeline", label: "Timeline", desc: "History / events" },
    { href: "/archive/world/factions", label: "Factions", desc: "Groups & power" },
    { href: "/archive/world/locations", label: "Locations", desc: "Districts / places" },
    { label: "Map", desc: "Reserved (future module)", disabled: true },
  ]}
/>

          }
        />
      </section>

      {/* PROTOCOLS */}
      <section className="space-y-4">
<div className="text-xs font-mono uppercase tracking-[0.22em] opacity-60">
  SYSTEMS
</div>

<BigCard
  href="/archive/systems"
  label="Rules & Mechanics"
  desc="How the world works: systems, mechanics, boundaries, FAQ."
  ctaLabel="EXPLORE SYSTEMS"
  right={
<QuickLinks
  items={[
    { href: "/archive/systems/rules", label: "Rules", desc: "Boundaries & etiquette" },
    { href: "/archive/systems/mechanics", label: "Mechanics", desc: "Systems & gameplay rules" },
    { href: "/archive/systems/faq", label: "FAQ", desc: "Common questions" },
  ]}
/>

          }
        />
      </section>
    </div>
  );
}
