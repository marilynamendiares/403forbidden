"use client";

import Link from "next/link";
import AvatarImg from "@/components/avatarImg";
import type { ArcCardT } from "@/server/contracts/arcs";

export type ArcPagePayload = {
  items: ArcCardT[];
  nextCursor: string | null;
};

export type ActivityFilter = "dead" | "warm" | "hot" | null;
export type CatalogSort = "recent" | "trending" | "new";

export type CatalogState = {
  q: string;
  status: string | null;
  format: string | null;
  activity: ActivityFilter;
  tag: string | null;
  sort: CatalogSort;
};

export const DEFAULT_CATALOG_STATE: CatalogState = {
  q: "",
  status: null,
  format: null,
  activity: null,
  tag: null,
  sort: "recent",
};

export const QUICK_CHIP_PRESETS: Record<
  string,
  Partial<CatalogState> & { kind?: "replace" | "toggle"; qAppend?: string }
> = {
  "#ongoing": { status: "ONGOING" },
  "#finished": { status: "FINISHED" },
  "#abandoned": { status: "ABANDONED" },
  "#solo": { format: "SOLO" },
  "#duo": { format: "DUO" },
  "#group": { format: "GROUP" },
  "#dark": { tag: "dark" },
  "#romance": { tag: "romance" },
  "#glitch": { tag: "glitch" },
};

function buildArcHref(arc: ArcCardT) {
  return arc.continueUrl ?? `/arcs/${arc.slug}`;
}

export function buildCatalogUrl(state: CatalogState, cursor?: string | null) {
  const searchParams = new URLSearchParams();
  if (state.q.trim()) searchParams.set("q", state.q.trim());
  if (state.status) searchParams.set("status", state.status);
  if (state.format) searchParams.set("format", state.format);
  if (state.activity) searchParams.set("activity", state.activity);
  if (state.tag) searchParams.set("tag", state.tag);
  if (state.sort) searchParams.set("sort", state.sort);
  if (cursor) searchParams.set("cursor", cursor);
  searchParams.set("limit", "12");
  return `/api/arcs/catalog?${searchParams.toString()}`;
}

export function buildSearchUrl(state: CatalogState) {
  const searchParams = new URLSearchParams();
  searchParams.set("q", state.q.trim());
  if (state.status) searchParams.set("status", state.status);
  if (state.format) searchParams.set("format", state.format);
  if (state.activity) searchParams.set("activity", state.activity);
  if (state.tag) searchParams.set("tag", state.tag);
  if (state.sort) searchParams.set("sort", state.sort);
  searchParams.set("limit", "12");
  return `/api/arcs/search?${searchParams.toString()}`;
}

export function applyQuickChipToState(state: CatalogState, chip: string) {
  const preset = QUICK_CHIP_PRESETS[chip];
  if (!preset) {
    return state;
  }

  const next = { ...state };

  if (preset.status) next.status = state.status === preset.status ? null : preset.status;
  if (preset.format) next.format = state.format === preset.format ? null : preset.format;
  if (preset.tag) next.tag = state.tag === preset.tag ? null : preset.tag;
  if (preset.qAppend) next.q = state.q.trim() === preset.qAppend ? "" : preset.qAppend;

  return next;
}

export function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="space-y-3">
        <div className="header-font-archimoto text-[13px] font-thin uppercase leading-none tracking-[0.18em] text-[#666666]">
          {eyebrow}
        </div>
        <div className="text-[26px] font-medium leading-none tracking-[-0.02em]">{title}</div>
        {body ? <p className="max-w-[720px] text-[15px] leading-6 text-[#666666]">{body}</p> : null}
      </div>
    </div>
  );
}

function ArcParticipantsStack({ participants }: { participants: ArcCardT["participants"] }) {
  if (participants.length === 0) return null;

  return (
    <div className="flex items-center">
      {participants.slice(0, 4).map((participant, index) => (
        <div
          key={participant.id}
          className="relative"
          style={{
            marginLeft: index === 0 ? 0 : -10,
            zIndex: participants.length - index,
          }}
        >
          <AvatarImg
            src={participant.avatarUrl ?? undefined}
            alt={participant.displayName ?? participant.username ?? "participant"}
            className="h-9 w-9 rounded-full object-cover bg-[#73767C]"
          />
        </div>
      ))}
    </div>
  );
}

export function ArcCard({ arc, compact = false }: { arc: ArcCardT; compact?: boolean }) {
  return (
    <Link
      href={buildArcHref(arc)}
      className={[
        "group flex h-full flex-col justify-between rounded-[24px] border border-[#6D6F73] bg-[#8E9197] p-5 transition-colors hover:border-[#55585E] hover:bg-[#979BA1]",
        compact ? "min-h-[220px]" : "min-h-[250px]",
      ].join(" ")}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <ArcParticipantsStack participants={arc.participants} />
          <div className="header-font-archimoto text-[13px] font-thin uppercase leading-none tracking-[0.16em] text-[#666666]">
            {arc.activityBucket}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[24px] font-medium leading-none tracking-[-0.03em]">{arc.title}</div>
          <p className="line-clamp-2 text-[15px] leading-6 text-[#666666]">
            {arc.hook || arc.tagline || "No hook yet."}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="header-font-archimoto rounded-full border border-neutral-300 px-3 py-1 text-[12px] font-thin uppercase leading-none tracking-[0.14em] text-[#2D2D2D]">
            {arc.status.toLowerCase()}
          </span>
          <span className="header-font-archimoto rounded-full border border-neutral-300 px-3 py-1 text-[12px] font-thin uppercase leading-none tracking-[0.14em] text-[#666666]">
            {arc.format.toLowerCase()}
          </span>
          {arc.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.slug}
              className="header-font-archimoto rounded-full border border-neutral-300 px-3 py-1 text-[12px] font-thin uppercase leading-none tracking-[0.14em] text-[#666666]"
            >
              #{tag.slug}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[13px] uppercase tracking-[0.18em] text-[#666666]">Heat</div>
            <div className="header-font-archimoto text-[20px] leading-none text-[#2D2D2D]">
              {String(arc.heatScore).padStart(2, "0")}
            </div>
          </div>

          <div className="grid gap-1 text-right">
            <div className="text-[13px] text-[#666666]">{arc.followersCount} followers</div>
            <div className="text-[13px] text-[#666666]">{arc.postsTotal} posts</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ArcGridSection({
  eyebrow,
  title,
  body,
  items,
  emptyLabel,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  items: ArcCardT[];
  emptyLabel: string;
}) {
  return (
    <section className="space-y-8">
      <SectionHeading eyebrow={eyebrow} title={title} body={body} />
      {items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-neutral-300 p-8 text-[15px] text-[#666666]">
          {emptyLabel}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((arc) => (
            <ArcCard key={arc.id} arc={arc} />
          ))}
        </div>
      )}
    </section>
  );
}

export function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "header-font-archimoto border px-3 py-2 text-[13px] font-thin uppercase leading-none tracking-[0.16em] transition-colors",
        active
          ? "border-[#2D2D2D] bg-[#2D2D2D] text-[#F3F0E8]"
          : "border-[#AFAAA1] bg-transparent text-[#666666] hover:border-[#2D2D2D]/40 hover:text-[#2D2D2D]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function ArcsSearchCluster({
  query,
  quickFilters,
  state,
  onQueryChange,
  onQuickChip,
  onReset,
}: {
  query: string;
  quickFilters: string[];
  state: CatalogState;
  onQueryChange: (value: string) => void;
  onQuickChip: (chip: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="sr-only">Search arcs</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by title, player, tag, or fragment..."
          className="h-[52px] w-full border border-[#7E7971] bg-[#C8C8C8]/38 px-4 text-[13px] font-normal uppercase leading-none tracking-[0.1em] text-[#2D2D2D] outline-none placeholder:text-[#6F6A63] [font-family:var(--font-geist-mono)]"
        />
      </label>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((chip) => {
            const preset = QUICK_CHIP_PRESETS[chip];
            const active =
              (preset?.status && state.status === preset.status) ||
              (preset?.format && state.format === preset.format) ||
              (preset?.tag && state.tag === preset.tag) ||
              (preset?.qAppend && state.q.trim() === preset.qAppend);

            return (
              <FilterButton key={chip} active={Boolean(active)} onClick={() => onQuickChip(chip)}>
                {chip}
              </FilterButton>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="header-font-archimoto px-0 py-2 text-[13px] uppercase tracking-[0.18em] text-[#2D2D2D] transition-opacity hover:opacity-60"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function CatalogFilterBar({
  state,
  onChange,
}: {
  state: CatalogState;
  onChange: (updater: (prev: CatalogState) => CatalogState) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <FilterButton
        active={state.status === "ONGOING"}
        onClick={() => onChange((prev) => ({ ...prev, status: prev.status === "ONGOING" ? null : "ONGOING" }))}
      >
        ongoing
      </FilterButton>
      <FilterButton
        active={state.status === "FINISHED"}
        onClick={() => onChange((prev) => ({ ...prev, status: prev.status === "FINISHED" ? null : "FINISHED" }))}
      >
        finished
      </FilterButton>
      <FilterButton
        active={state.status === "ABANDONED"}
        onClick={() => onChange((prev) => ({ ...prev, status: prev.status === "ABANDONED" ? null : "ABANDONED" }))}
      >
        abandoned
      </FilterButton>
      <FilterButton
        active={state.format === "SOLO"}
        onClick={() => onChange((prev) => ({ ...prev, format: prev.format === "SOLO" ? null : "SOLO" }))}
      >
        solo
      </FilterButton>
      <FilterButton
        active={state.format === "DUO"}
        onClick={() => onChange((prev) => ({ ...prev, format: prev.format === "DUO" ? null : "DUO" }))}
      >
        duo
      </FilterButton>
      <FilterButton
        active={state.format === "GROUP"}
        onClick={() => onChange((prev) => ({ ...prev, format: prev.format === "GROUP" ? null : "GROUP" }))}
      >
        group
      </FilterButton>
      <FilterButton
        active={state.activity === "dead"}
        onClick={() => onChange((prev) => ({ ...prev, activity: prev.activity === "dead" ? null : "dead" }))}
      >
        dead
      </FilterButton>
      <FilterButton
        active={state.activity === "warm"}
        onClick={() => onChange((prev) => ({ ...prev, activity: prev.activity === "warm" ? null : "warm" }))}
      >
        warm
      </FilterButton>
      <FilterButton
        active={state.activity === "hot"}
        onClick={() => onChange((prev) => ({ ...prev, activity: prev.activity === "hot" ? null : "hot" }))}
      >
        hot
      </FilterButton>
      <FilterButton active={state.sort === "trending"} onClick={() => onChange((prev) => ({ ...prev, sort: "trending" }))}>
        sort: trending
      </FilterButton>
      <FilterButton active={state.sort === "recent"} onClick={() => onChange((prev) => ({ ...prev, sort: "recent" }))}>
        sort: recent
      </FilterButton>
      <FilterButton active={state.sort === "new"} onClick={() => onChange((prev) => ({ ...prev, sort: "new" }))}>
        sort: new
      </FilterButton>
    </div>
  );
}
