"use client";

import {
  useDeferredValue,
  useRef,
  useState,
} from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import type { ArcsDiscoveryResponseT } from "@/server/contracts/arcs";
import {
  applyQuickChipToState,
  ArcCard,
  ArcGridSection,
  ArcsSearchCluster,
  CatalogFilterBar,
  type ArcPagePayload,
  type CatalogState,
  DEFAULT_CATALOG_STATE,
  SectionHeading,
} from "@/components/arcs/arcsDiscoveryUi";
import { useArcsCatalogSearch } from "@/hooks/useArcsCatalogSearch";
import { useStickyOverlayFromAnchor } from "@/hooks/useStickyOverlayFromAnchor";

type Props = {
  initialDiscovery: ArcsDiscoveryResponseT;
  initialCatalog: ArcPagePayload;
  createAction: (formData: FormData) => Promise<void>;
  canCreateArc: boolean;
};

export default function ArcsDiscoveryClient({
  initialDiscovery,
  initialCatalog,
  createAction,
  canCreateArc,
}: Props) {
  const [state, setState] = useState<CatalogState>(DEFAULT_CATALOG_STATE);
  const deferredQuery = useDeferredValue(state.q);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickySearchRef = useRef<HTMLDivElement | null>(null);
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);
  const {
    catalog,
    searchResults,
    loadingCatalog,
    loadingSearch,
    hasSearch,
    loadMoreCatalog,
    resetCatalogState,
  } = useArcsCatalogSearch({
    state,
    deferredQuery,
    initialCatalog,
  });

  function applyQuickChip(chip: string) {
    setState((prev) => applyQuickChipToState(prev, chip));
  }

  const visibleSearchItems = searchResults?.items ?? [];

  useStickyOverlayFromAnchor({
    scrollRef,
    overlayRef: stickySearchRef,
    anchorRef: searchAnchorRef,
    dependencyKey: `${state.q}:${initialDiscovery.quickFilters.length}`,
  });

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <div
        ref={stickySearchRef}
        className="absolute left-[72px] right-px top-0 z-30 will-change-transform"
      >
        <div className="pb-4">
          <ArcsSearchCluster
            query={state.q}
            quickFilters={initialDiscovery.quickFilters}
            state={state}
            onQueryChange={(value) => setState((prev) => ({ ...prev, q: value }))}
            onQuickChip={applyQuickChip}
            onReset={() => {
              setState(DEFAULT_CATALOG_STATE);
              resetCatalogState();
            }}
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-hidden h-full min-h-0 overflow-y-auto pb-10 pl-[72px]"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.04) 44px, rgba(0,0,0,0.1) 92px, rgba(0,0,0,0.24) 148px, rgba(0,0,0,0.5) 208px, rgba(0,0,0,0.8) 268px, #000 324px, #000 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.04) 44px, rgba(0,0,0,0.1) 92px, rgba(0,0,0,0.24) 148px, rgba(0,0,0,0.5) 208px, rgba(0,0,0,0.8) 268px, #000 324px, #000 100%)",
        }}
      >
        <div aria-hidden="true" className="h-[182px]" />

        <section className="space-y-8">
          <div className="mx-auto max-w-[760px] text-center">
          <h1
            className="header-font-archimoto text-[36px] font-medium leading-none uppercase"
            style={{ fontFeatureSettings: '"ss01" 1' }}
          >
            ARCS
            <span className="ml-1 align-top text-[18px]">™</span>
          </h1>
            <p className="header-font-archimoto mt-3 text-[15px] font-normal leading-none text-[#666666]">
              Augmented Reality Construct System
            </p>
          </div>
        </section>

        <div className="space-y-20">
          <div ref={searchAnchorRef} className="pt-[100px]">
            <div aria-hidden="true" className="invisible">
              <ArcsSearchCluster
                query={state.q}
                quickFilters={initialDiscovery.quickFilters}
                state={state}
                onQueryChange={(value) => setState((prev) => ({ ...prev, q: value }))}
                onQuickChip={applyQuickChip}
                onReset={() => {
                  setState(DEFAULT_CATALOG_STATE);
                  resetCatalogState();
                }}
              />
            </div>
          </div>

          {hasSearch ? (
            <section className="space-y-8">
              <SectionHeading
                eyebrow="Search Results"
                title={loadingSearch ? "Searching the archive" : "Search"}
                body="Weighted search now blends title, participants, tags and indexed fragments into a stronger discovery pass."
              />
              {visibleSearchItems.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-neutral-300 p-8 text-[15px] text-[#666666]">
                  No arcs matched the current query.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleSearchItems.map((arc) => (
                    <ArcCard key={arc.id} arc={arc} />
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {!hasSearch ? (
            <>
              <ArcGridSection
                eyebrow="Top / Trending"
                title="Hot arcs right now"
                body="Recent posting velocity, reaction pressure and fresh activity are blended into a single heat layer."
                items={initialDiscovery.topTrending}
                emptyLabel="No trending arcs yet."
              />

              <ArcGridSection
                eyebrow="New / Just Started"
                title="Fresh entries"
                body="Arcs with only a few posts on record. Early movement, low sediment."
                items={initialDiscovery.newJustStarted}
                emptyLabel="No newly started arcs yet."
              />

              <ArcGridSection
                eyebrow="Recently Updated"
                title="Where the signal moved last"
                body="Arcs with the latest posting or chapter activity."
                items={initialDiscovery.recentlyUpdated}
                emptyLabel="No recently updated arcs yet."
              />

              {initialDiscovery.continueReading.length > 0 ? (
                <ArcGridSection
                  eyebrow="Continue Reading"
                  title="Your active trail"
                  body="Arcs where your reading history already left a mark."
                  items={initialDiscovery.continueReading}
                  emptyLabel="You have not started reading any arcs yet."
                />
              ) : null}

              <ArcGridSection
                eyebrow="Underground / Hidden"
                title="Buried threads and brain dances"
                body="The less rule-bound layer of the archive. Experimental, underground, or intentionally off-center."
                items={initialDiscovery.underground}
                emptyLabel="No underground arcs surfaced yet."
              />
            </>
          ) : null}

          <section className="space-y-8">
            <SectionHeading
              eyebrow="Explore / All Arcs"
              title="Catalog"
              body="Primary archive view with stateful filters. This is the operational index, not just a decorative shelf."
            />

            <CatalogFilterBar state={state} onChange={(updater) => setState(updater)} />

            {catalog.items.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-neutral-300 p-8 text-[15px] text-[#666666]">
                No arcs matched the current catalog filters.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {catalog.items.map((arc) => (
                  <ArcCard key={`${arc.id}-${arc.publicSlug}`} arc={arc} compact />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="text-[14px] text-[#666666]">
                {loadingCatalog ? "Refreshing catalog..." : `${catalog.items.length} arc(s) loaded`}
              </div>
              {catalog.nextCursor ? (
                <button
                  type="button"
                  onClick={() => void loadMoreCatalog()}
                  className="header-font-archimoto rounded-full border border-neutral-300 px-4 py-3 text-[13px] uppercase tracking-[0.16em] text-[#2D2D2D] transition-colors hover:border-[#2D2D2D]/40"
                >
                  Load More
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-[30px] border border-neutral-300 bg-[#F7F3EA] p-6 md:p-8">
            <SectionHeading
              eyebrow="Create"
              title="Start a new arc"
              body="The old creation flow stays available while the archive grows into discovery mode."
            />

            <CollapsibleSection
              label="Create an arc"
              className="mt-10"
              buttonClassName="border-neutral-300 bg-[#2D2D2D] text-[#F3F0E8] hover:bg-[#3A3A3A]"
              panelClassName="border-neutral-300 bg-[#F3F0E8]/80"
            >
              {canCreateArc ? (
                <form action={createAction} className="space-y-3">
                  <input
                    name="title"
                    placeholder="Title"
                    className="w-full rounded border border-neutral-400 bg-transparent px-3 py-2 text-[#2D2D2D]"
                    required
                  />
                  <input
                    name="tagline"
                    placeholder="Tagline (optional)"
                    className="w-full rounded border border-neutral-400 bg-transparent px-3 py-2 text-[#2D2D2D]"
                  />
                  <button className="rounded border border-neutral-400 px-4 py-2 text-[#2D2D2D] transition hover:bg-[#2D2D2D]/5">
                    Create
                  </button>
                  <p className="text-xs text-[#666666]">Available to approved players.</p>
                </form>
              ) : (
                <div className="space-y-3 text-sm text-[#666666]">
                  <p>Restricted users can read public arcs in view-only mode.</p>
                  <p>Create access unlocks after your character application is approved.</p>
                </div>
              )}
            </CollapsibleSection>
          </section>
        </div>
      </div>
    </div>
  );
}
