import Link from "next/link";

export const dynamic = "force-dynamic";

type WorldLink = {
  title: string;
  desc: string;
  href?: string;
  disabled?: boolean;
};

const WORLD_LINKS: WorldLink[] = [
  {
    title: "Lore",
    desc: "Canonical texts and narrative fragments.",
    href: "/archive/world/lore",
  },
  {
    title: "Timeline",
    desc: "Key historical events and eras.",
    href: "/archive/world/timeline",
  },
  {
    title: "Factions",
    desc: "Groups, power structures, influence.",
    href: "/archive/world/factions",
  },
  {
    title: "Locations",
    desc: "Districts, places, controlled zones.",
    href: "/archive/world/locations",
  },
  {
    title: "Map",
    desc: "Spatial representation of the city.",
    disabled: true,
  },
];

export default function WorldIndexPage() {
  return (
    <div className="space-y-10">
      {/* header */}
      <div className="space-y-2">
        <Link
          href="/archive"
          className="text-sm opacity-60 hover:opacity-100 transition"
        >
          ← Back to Archive
        </Link>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            City / World
          </h1>
          <span className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
            WORLD
          </span>
        </div>

        <p className="text-sm opacity-70 max-w-2xl">
          The canonical description of the city, its history, structures, and
          forces. This section defines the world your character inhabits.
        </p>
      </div>

      {/* World Overview master card */}
<div className="pt-2 pb-4">
  <div className="text-center text-xs font-mono uppercase tracking-[0.28em] opacity-50">
    WORLD OVERVIEW
  </div>

  <p className="mt-4 text-sm opacity-70 leading-relaxed max-w-2xl mx-auto text-center">
    This page will contain the canonical overview of the city — a compact, authoritative
briefing on how it is built, who holds power, what the public is allowed to know,
and what is kept behind closed networks. Here we’ll outline the main districts and
their purpose, the forces that enforce order, the layers of infrastructure that keep
the metropolis alive, and the quiet rules that shape daily life: what people trade,
what they fear, what they pretend not to see, and what happens when someone steps
outside the permitted script.

  </p>
</div>



      {/* Subsections */}
      <div className="grid sm:grid-cols-2 gap-4">
        {WORLD_LINKS.map((x) =>
          x.disabled ? (
            <div
              key={x.title}
              className="border border-white/10 rounded-xl p-4 bg-white/1.5 opacity-40 cursor-not-allowed"
            >
              <h3 className="font-medium">{x.title}</h3>
              <p className="text-sm opacity-60 mt-1">{x.desc}</p>
              <p className="text-xs font-mono mt-2 opacity-50">
                Reserved / future module
              </p>
            </div>
          ) : (
            <Link
              key={x.href}
              href={x.href!}
              className="border border-white/10 rounded-xl p-4 bg-white/1.5 hover:bg-white/3 transition"
            >
              <h3 className="font-medium">{x.title}</h3>
              <p className="text-sm opacity-70 mt-1">{x.desc}</p>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
