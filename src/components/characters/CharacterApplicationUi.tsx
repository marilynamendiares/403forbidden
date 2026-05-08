"use client";

import type { CharacterForm } from "@/lib/characterApplication";

type FormValue = {
  name: string;
  age: string;
  gender: string;
  occupation: string;
  visualRefUrl: string;
  appearance: string;
  personality: string;
  background: string;
};

type FormChangeHandlers = {
  onNameChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onOccupationChange: (value: string) => void;
  onVisualRefUpload: (file: File) => void;
  onVisualRefRemove: () => void;
  onAppearanceChange: (value: string) => void;
  onPersonalityChange: (value: string) => void;
  onBackgroundChange: (value: string) => void;
};

function FieldLabel({ children }: { children: string }) {
  return <label className="mb-1 block text-xs opacity-70">{children}</label>;
}

function InputField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: "text" | "number";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        className="w-full rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  minHeightClass,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeightClass: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        className={`w-full rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm ${minHeightClass}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}

export function CharacterApplicationModeratorNote({
  note,
}: {
  note: string;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <div className="mb-1 text-xs uppercase tracking-wide opacity-80">Moderator note</div>
      <div className="whitespace-pre-wrap">{note}</div>
    </div>
  );
}

export function CharacterApplicationForm({
  value,
  handlers,
  disabled,
  visualRefBusy = false,
}: {
  value: FormValue;
  handlers: FormChangeHandlers;
  disabled?: boolean;
  visualRefBusy?: boolean;
}) {
  return (
    <div className="space-y-5">
      <InputField
        label="Character name"
        value={value.name}
        onChange={handlers.onNameChange}
        disabled={disabled}
        placeholder="e.g. Marilyn Amendiares"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InputField
          label="Age"
          value={value.age}
          onChange={handlers.onAgeChange}
          disabled={disabled}
          placeholder="e.g. 27"
          type="number"
          inputMode="numeric"
        />
        <InputField
          label="Gender"
          value={value.gender}
          onChange={handlers.onGenderChange}
          disabled={disabled}
          placeholder="e.g. Female"
        />
        <InputField
          label="Occupation"
          value={value.occupation}
          onChange={handlers.onOccupationChange}
          disabled={disabled}
          placeholder="e.g. Fixer / Runner"
        />
      </div>

      <div>
        <FieldLabel>Visual ref</FieldLabel>
        <div className="grid gap-3 rounded-md border border-neutral-800 p-3 sm:grid-cols-[148px_1fr]">
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border border-neutral-900 bg-neutral-950/40 text-center text-xs opacity-70">
            {value.visualRefUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value.visualRefUrl}
                alt="Character visual reference"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-3">No visual reference uploaded.</span>
            )}
          </div>

          <div className="flex flex-col justify-between gap-3">
            <p className="text-xs leading-5 opacity-70">
              Upload a reference image for the character appearance. This supports the written appearance section, it does not replace it.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-neutral-800 px-3 py-2 text-xs hover:bg-neutral-900 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                {visualRefBusy ? "Uploading..." : "Upload image"}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  disabled={disabled || visualRefBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) handlers.onVisualRefUpload(file);
                  }}
                />
              </label>

              {value.visualRefUrl ? (
                <button
                  type="button"
                  onClick={handlers.onVisualRefRemove}
                  disabled={disabled || visualRefBusy}
                  className="rounded-md border border-neutral-800 px-3 py-2 text-xs hover:bg-neutral-900 disabled:opacity-50"
                >
                  Remove image
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <TextAreaField
        label="Appearance"
        value={value.appearance}
        onChange={handlers.onAppearanceChange}
        disabled={disabled}
        placeholder="Describe appearance..."
        minHeightClass="min-h-[140px]"
      />

      <TextAreaField
        label="Personality"
        value={value.personality}
        onChange={handlers.onPersonalityChange}
        disabled={disabled}
        placeholder="Describe personality..."
        minHeightClass="min-h-[140px]"
      />

      <TextAreaField
        label="Background"
        value={value.background}
        onChange={handlers.onBackgroundChange}
        disabled={disabled}
        placeholder="Write background story..."
        minHeightClass="min-h-[180px]"
      />
    </div>
  );
}

function ReadonlyField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string | number | null | undefined;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-3" : undefined}>
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

function ReadonlyBlock({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="mb-1 text-xs opacity-60">{label}</div>
      <div className="whitespace-pre-wrap rounded-md border border-neutral-900 bg-neutral-950/30 p-3 text-sm">
        {value || "—"}
      </div>
    </div>
  );
}

export function CharacterApplicationReadonlyDetails({
  name,
  form,
}: {
  name: string;
  form: CharacterForm | null | undefined;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs opacity-60">Name</div>
          <div className="text-lg font-semibold">{name}</div>
        </div>
        <ReadonlyField label="Age" value={form?.age ?? null} />
        <ReadonlyField label="Gender" value={form?.gender ?? null} />
        <ReadonlyField label="Occupation" value={form?.occupation ?? null} fullWidth />
      </div>

      {form?.visualRefUrl ? (
        <div>
          <div className="mb-1 text-xs opacity-60">Visual ref</div>
          <div className="max-w-[220px] overflow-hidden rounded-md border border-neutral-900 bg-neutral-950/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.visualRefUrl}
              alt="Character visual reference"
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
        </div>
      ) : null}

      <ReadonlyBlock label="Appearance" value={form?.appearance} />
      <ReadonlyBlock label="Personality" value={form?.personality} />
      <ReadonlyBlock label="Background" value={form?.background} />
    </div>
  );
}
