import Link from "next/link";
import type { CharacterForm } from "@/lib/characterApplication";
import { resolveMediaUrl } from "@/lib/media";

export type CharacterProfileCardData = {
  id: string;
  name: string;
  form: CharacterForm;
};

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-neutral-200">{value || "-"}</div>
    </div>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap rounded-md border border-neutral-900 bg-black/20 p-3 text-sm leading-6 text-neutral-300">
        {value || "-"}
      </div>
    </div>
  );
}

export function CharacterProfileCard({
  character,
  dossierHref,
  defaultOpen = false,
}: {
  character: CharacterProfileCardData;
  dossierHref?: string;
  defaultOpen?: boolean;
}) {
  const form = character.form;
  const visualRef = resolveMediaUrl(form.visualRefUrl);

  return (
    <details
      className="group rounded-xl border border-neutral-800 bg-neutral-950/35 p-4"
      open={defaultOpen}
    >
      <summary className="grid cursor-pointer list-none gap-3 sm:grid-cols-[84px_1fr] [&::-webkit-details-marker]:hidden">
        <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border border-neutral-900 bg-neutral-950/70 text-center text-[11px] uppercase tracking-[0.12em] text-neutral-600">
          {visualRef ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={visualRef}
              alt={`${character.name} visual reference`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-2">No visual ref</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/70">
            Approved citizen profile
          </div>
          <h2 className="mt-1 truncate text-lg font-semibold text-neutral-100">
            {character.name}
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-400">
            <span>{form.age ? `${form.age} years` : "age unknown"}</span>
            <span>{form.gender || "gender unknown"}</span>
            <span className="col-span-2 truncate">
              {form.occupation || "occupation unknown"}
            </span>
          </div>
          <div className="mt-3 text-xs text-neutral-500 group-open:hidden">
            open character dossier
          </div>
        </div>
      </summary>

      <div className="mt-4 space-y-4 border-t border-neutral-900 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Age" value={form.age ?? null} />
          <Field label="Gender" value={form.gender} />
          <Field label="Occupation" value={form.occupation} />
        </div>

        <TextBlock label="Appearance" value={form.appearance} />
        <TextBlock label="Personality" value={form.personality} />
        <TextBlock label="Background" value={form.background} />

        {dossierHref ? (
          <Link
            href={dossierHref}
            className="inline-flex rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-neutral-500 hover:bg-neutral-900"
          >
            Open character dossier
          </Link>
        ) : null}
      </div>
    </details>
  );
}
