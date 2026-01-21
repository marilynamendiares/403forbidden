// src/app/world/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getSessionUserId } from "@/server/sessionUserId";
import { isPlayer } from "@/server/player";
import Globe from "@/components/Globe";
import CornerArrow from "@/components/CornerArrow";

export const dynamic = "force-dynamic";

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
      <div
        className={[base, locked ? "opacity-70" : "", className ?? ""].join(" ")}
      >
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
    <div className="border border-white/10 rounded-none p-6 bg-white/2">
      <div className="flex items-start justify-between gap-8">
        {/* LEFT — CTA */}
        <Link
          href={href}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-[0.22em] bg-white text-neutral-900 hover:bg-white/90 transition"
        >
          {ctaLabel}
          <span aria-hidden>→</span>
        </Link>

        {/* RIGHT — TITLE + DESC */}
        <div className="min-w-0 text-right max-w-130 ml-auto">
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
  layout = "grid",
}: {
  items: Array<{ href?: string; label: string; desc?: string; disabled?: boolean }>;
  layout?: "grid" | "world";
}) {
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((x) =>
          x.disabled || !x.href ? (
            x.label === "Map" ? (
              <div
                key={x.label}
                className={[
                  "sm:col-span-2",
                  "relative overflow-hidden",
                  "border border-white/10 rounded-none",
                  "p-6",
                  "min-h-35",
                  "bg-white/2",
                  "opacity-70 cursor-not-allowed",
                ].join(" ")}
                aria-disabled="true"
              >
                {/* texture overlay */}
                <div
                  className="absolute inset-0 opacity-[0.20]"
                  style={{
                    backgroundImage: `
                      repeating-linear-gradient(
                        135deg,
                        rgba(255,255,255,0.25) 0px,
                        rgba(255,255,255,0.25) 1px,
                        transparent 1px,
                        transparent 32px
                      ),
                      repeating-linear-gradient(
                        45deg,
                        rgba(255,255,255,0.15) 0px,
                        rgba(255,255,255,0.15) 1px,
                        transparent 1px,
                        transparent 48px
                      )
                    `,
                  }}
                />

                {/* vignette */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(80% 80% at 50% 30%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.6) 100%)",
                  }}
                />

                <div className="relative h-full flex flex-col items-center justify-center text-center">
                  <div className="text-base font-semibold tracking-wide">Map</div>
                  <div className="mt-2 text-xs font-mono uppercase tracking-[0.22em] opacity-70">
                    Under Construction
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={x.label}
                className="border border-white/10 rounded-none p-4 bg-white/1.5 opacity-40 cursor-not-allowed"
                aria-disabled="true"
              >
                <div className="text-sm font-semibold">{x.label}</div>
                {x.desc && <div className="text-sm opacity-60 mt-1">{x.desc}</div>}
              </div>
            )
          ) : (
        <Link
          key={`${x.href}:${x.label}`}
          href={x.href}
          className="group relative border border-white/10 rounded-none p-4 bg-white/1.5 hover:bg-white/3 transition"
        >
      <CornerArrow />

      <div className="text-sm font-semibold pr-12">{x.label}</div>
      {x.desc && <div className="text-sm opacity-70 mt-1 pr-12">{x.desc}</div>}
        </Link>

          )
        )}
      </div>
    </div>
  );
}

export default async function WorldIndexPage() {
  const session = await getServerSession(authOptions);
  const me = getSessionUserId(session);
  const player = me ? await isPlayer(me) : false;

  return (
    <div className="space-y-10">
      {/* Optional: keep a subtle back link if you want */}
      {/* <Link className="text-sm opacity-60 hover:opacity-100 transition" href="/forum">
        ← Back to Forum
      </Link> */}

      {/* WORLD OVERVIEW (centered) */}

<div className="pt-6 pb-4 space-y-4">
  {/* Globe sigil */}
  <div className="flex justify-center">
    <Globe size={160} />
  </div>

  {/* Title */}
  <div className="text-center text-xs font-mono uppercase tracking-[0.28em] opacity-50">
    WORLD OVERVIEW
  </div>

  {/* Text */}
  <p className="text-sm opacity-70 leading-relaxed max-w-2xl mx-auto text-center">
    This page will contain the canonical overview of the city — a compact,
    authoritative briefing on how it is built, who holds power, what the public is
    allowed to know, and what is kept behind closed networks. Here we’ll outline
    the main districts and their purpose, the forces that enforce order, the layers
    of infrastructure that keep the metropolis alive, and the quiet rules that
    shape daily life: what people trade, what they fear, what they pretend not to
    see, and what happens when someone steps outside the permitted script.
  </p>
</div>


{/* WORLD QUICK LINKS */}
<section>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {/* LEFT COLUMN */}
    <div className="flex flex-col gap-3">
      {[
        { href: "/world/lore", label: "Lore", desc: "Canon & fragments" },
        { href: "/world/timeline", label: "Timeline", desc: "History / events" },
        { href: "/world/factions", label: "Factions", desc: "Groups & power" },
        { href: "/world/locations", label: "Locations", desc: "Districts / places" },
      ].map((x) => (
        <Link
          key={x.href}
          href={x.href}
          className="group relative border border-white/10 rounded-none p-4 bg-white/1.5 hover:bg-white/3 transition"
        >
          <CornerArrow />
          <div className="text-sm font-semibold pr-12">{x.label}</div>
          <div className="text-sm opacity-70 mt-1 pr-12">{x.desc}</div>
        </Link>
      ))}
    </div>

    {/* RIGHT COLUMN — MAP */}
    <div className="relative overflow-hidden border border-white/10 rounded-none p-6 bg-white/2 opacity-70 cursor-not-allowed min-h-full">
      {/* texture */}
      <div
        className="absolute inset-0 opacity-[0.20]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              135deg,
              rgba(255,255,255,0.25) 0px,
              rgba(255,255,255,0.25) 1px,
              transparent 1px,
              transparent 32px
            ),
            repeating-linear-gradient(
              45deg,
              rgba(255,255,255,0.15) 0px,
              rgba(255,255,255,0.15) 1px,
              transparent 1px,
              transparent 48px
            )
          `,
        }}
      />

      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 80% at 50% 30%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      <div className="relative h-full flex flex-col items-center justify-center text-center">
        <div className="text-base font-semibold tracking-wide">Map</div>
        <div className="mt-2 text-xs font-mono uppercase tracking-[0.22em] opacity-70">
          Under Construction
        </div>
      </div>
    </div>
  </div>
</section>




      {/* SYSTEMS (оставляем как у тебя — этот путь тебя устраивает) */}
      <section className="space-y-4">
        <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-60">
          SYSTEMS
        </div>

        <BigCard
          href="/world/systems"
          label="Rules & Mechanics"
          desc="How the world works: systems, mechanics, boundaries, FAQ."
          ctaLabel="EXPLORE SYSTEMS"
          right={
            <QuickLinks
              items={[
                { href: "/world/systems/rules", label: "Rules", desc: "Boundaries & etiquette" },
                { href: "/world/systems/mechanics", label: "Mechanics", desc: "Systems & gameplay rules" },
                { href: "/world/systems/faq", label: "FAQ", desc: "Common questions" },
              ]}
            />
          }
        />
      </section>
    </div>
  );
}
