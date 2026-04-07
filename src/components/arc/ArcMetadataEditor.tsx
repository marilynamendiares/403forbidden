import CollapsibleSection from "@/components/CollapsibleSection";
import { DISCOVERY_TAG_GROUP_LABELS, DISCOVERY_TAGS } from "@/lib/arcsMetadata";

type Props = {
  action: (formData: FormData) => Promise<void>;
  initial: {
    title: string;
    tagline: string | null;
    hook: string | null;
    summary: string | null;
    status: string;
    format: string;
    joinPolicy: string;
    visibility: string;
    searchVisibility: string;
    allowDiscovery: boolean;
    tags: string[];
  };
};

const STATUS_OPTIONS = ["ONGOING", "HIATUS", "FINISHED", "ABANDONED"];
const FORMAT_OPTIONS = ["SOLO", "DUO", "GROUP"];
const JOIN_POLICY_OPTIONS = ["PRIVATE", "CURATED", "OPEN"];
const VISIBILITY_OPTIONS = ["STANDARD", "UNDERGROUND"];
const SEARCH_VISIBILITY_OPTIONS = ["PUBLIC", "LIMITED", "HIDDEN"];

export function ArcMetadataEditor({ action, initial }: Props) {
  return (
    <CollapsibleSection
      label="Arc Metadata"
      buttonClassName="bg-transparent !text-[#2D2D2D] hover:bg-transparent"
      panelClassName="bg-transparent"
      className="mt-10"
    >
      <form action={action} className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">Title</label>
          <input
            name="title"
            defaultValue={initial.title}
            className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2 text-sm"
            minLength={2}
            maxLength={120}
            required
          />
        </div>

        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">Tagline</label>
          <input
            name="tagline"
            defaultValue={initial.tagline ?? ""}
            className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2 text-sm"
            maxLength={200}
            placeholder="Short descriptive line"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">Hook</label>
          <input
            name="hook"
            defaultValue={initial.hook ?? ""}
            className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2 text-sm"
            maxLength={160}
            placeholder="One-line discovery hook for cards"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">Summary</label>
          <textarea
            name="summary"
            defaultValue={initial.summary ?? ""}
            className="min-h-[110px] w-full rounded border border-neutral-700 bg-transparent px-3 py-2 text-sm"
            maxLength={700}
            placeholder="A fuller summary for discovery and context"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">Status</label>
            <select
              name="status"
              defaultValue={initial.status}
              className="rounded border border-neutral-700 bg-transparent px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">Format</label>
            <select
              name="format"
              defaultValue={initial.format}
              className="rounded border border-neutral-700 bg-transparent px-3 py-2 text-sm"
            >
              {FORMAT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">Join Policy</label>
            <select
              name="joinPolicy"
              defaultValue={initial.joinPolicy}
              className="rounded border border-neutral-700 bg-transparent px-3 py-2 text-sm"
            >
              {JOIN_POLICY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">Visibility</label>
            <select
              name="visibility"
              defaultValue={initial.visibility}
              className="rounded border border-neutral-700 bg-transparent px-3 py-2 text-sm"
            >
              {VISIBILITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">
              Search Visibility
            </label>
            <select
              name="searchVisibility"
              defaultValue={initial.searchVisibility}
              className="rounded border border-neutral-700 bg-transparent px-3 py-2 text-sm"
            >
              {SEARCH_VISIBILITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.18em] text-[#666666]">Tags</label>
          <div className="grid gap-3 rounded border border-neutral-800/60 p-3">
            {(["tone", "genre", "structure"] as const).map((group) => (
              <div key={group} className="grid gap-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#666666]">
                  {DISCOVERY_TAG_GROUP_LABELS[group]}
                </div>
                <div className="flex flex-wrap gap-2">
                  {DISCOVERY_TAGS.filter((tag) => tag.group === group).map((tag) => (
                    <label
                      key={tag.slug}
                      className="inline-flex items-center gap-2 border border-neutral-700 px-3 py-2 text-sm text-[#2D2D2D]"
                    >
                      <input
                        type="checkbox"
                        name="tags"
                        value={tag.slug}
                        defaultChecked={initial.tags.includes(tag.slug)}
                        className="h-4 w-4 rounded border border-neutral-700 bg-transparent"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#666666]">
            Curated discovery tags only. This keeps filters and search clean.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-[#2D2D2D]">
          <input
            type="checkbox"
            name="allowDiscovery"
            defaultChecked={initial.allowDiscovery}
            className="h-4 w-4 rounded border border-neutral-700 bg-transparent"
          />
          Allow this arc to appear in discovery surfaces
        </label>

        <div className="flex justify-end">
          <button className="rounded border border-neutral-700 px-4 py-2 text-sm text-[#2D2D2D] transition hover:bg-[#2D2D2D]/5">
            Save metadata
          </button>
        </div>
      </form>
    </CollapsibleSection>
  );
}
