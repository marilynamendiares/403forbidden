// src/app/characters/[id]/page.tsx
"use client";

import { use, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CharacterForm = {
  age?: number | null;
  gender?: string;
  occupation?: string;
  appearance?: string;
  personality?: string;
  background?: string;
};

type Item = {
  id: string;
  name: string;
  form: CharacterForm;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "NEEDS_CHANGES" | "APPROVED";
  updatedAt: string;
  moderatorNote: string | null;
};

type Props = { params: Promise<{ id: string }> };

export default function CharacterEditPage({ params }: Props) {
  const router = useRouter();
  const { id } = use(params);

  const [item, setItem] = useState<Item | null>(null);

  // core fields
  const [name, setName] = useState("");

  // form fields (plain)
  const [age, setAge] = useState<string>(""); // empty string = not set
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [appearance, setAppearance] = useState("");
  const [personality, setPersonality] = useState("");
  const [background, setBackground] = useState("");

  const [error, setError] = useState("");
  const [hint, setHint] = useState<string>("");

  const [isPending, startTransition] = useTransition();

  const editable = useMemo(() => {
    return item?.status === "DRAFT" || item?.status === "NEEDS_CHANGES";
  }, [item?.status]);

  function hydrateFromItem(it: Item) {
    setName(it.name ?? "");

    const f = (it.form ?? {}) as CharacterForm;

    // age into string
    if (f.age === null || f.age === undefined) setAge("");
    else setAge(String(f.age));

    setGender(f.gender ?? "");
    setOccupation(f.occupation ?? "");
    setAppearance(f.appearance ?? "");
    setPersonality(f.personality ?? "");
    setBackground(f.background ?? "");
  }

  async function load() {
    setError("");
    const res = await fetch(`/api/characters/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? "Failed to load");
      return;
    }

    const it = data?.item as Item;
    setItem(it);
    hydrateFromItem(it);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function validateAge(): { ok: true; value: number | null } | { ok: false; error: string } {
    const s = age.trim();
    if (s === "") return { ok: true, value: null };
    const n = Number(s);
    if (!Number.isFinite(n)) return { ok: false, error: "Age must be a number" };
    if (!Number.isInteger(n)) return { ok: false, error: "Age must be an integer" };
    if (n < 0 || n > 999) return { ok: false, error: "Age looks invalid" };
    return { ok: true, value: n };
  }

  async function save() {
    if (!item || !editable || isPending) return;
    setError("");
    setHint("");

    const ageCheck = validateAge();
    if (!ageCheck.ok) {
      setError(ageCheck.error);
      return;
    }

    const form: CharacterForm = {
      age: ageCheck.value,
      gender: gender.trim(),
      occupation: occupation.trim(),
      appearance: appearance.trim(),
      personality: personality.trim(),
      background: background.trim(),
    };

    startTransition(async () => {
      const res = await fetch(`/api/characters/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          form,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Save failed");
        return;
      }

      setHint("Saved.");
      await load();
    });
  }

  async function submit() {
    if (!item || !editable || isPending) return;
    setError("");
    setHint("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const ageCheck = validateAge();
    if (!ageCheck.ok) {
      setError(ageCheck.error);
      return;
    }

    startTransition(async () => {
      // optional: save latest before submit (без доп. UX)
      await fetch(`/api/characters/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          form: {
            age: ageCheck.value,
            gender: gender.trim(),
            occupation: occupation.trim(),
            appearance: appearance.trim(),
            personality: personality.trim(),
            background: background.trim(),
          } satisfies CharacterForm,
        }),
      }).catch(() => {});

      const res = await fetch(`/api/characters/${id}/submit`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Submit failed");
        return;
      }

      setHint("Submitted.");
      await load();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push("/characters")}
            className="text-sm opacity-70 hover:opacity-100"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-semibold mt-2">Character Application</h1>
          {item && <p className="text-sm opacity-70">Status: {item.status}</p>}
        </div>
      </div>

      {item?.moderatorNote && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="text-xs uppercase tracking-wide opacity-80 mb-1">
            Moderator note
          </div>
          <div className="whitespace-pre-wrap">{item.moderatorNote}</div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-900 p-4 space-y-5">
        <div>
          <label className="block text-xs opacity-70 mb-1">Character name</label>
          <input
            className="w-full rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editable || isPending}
            placeholder="e.g. Marilyn Amendiares"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs opacity-70 mb-1">Age</label>
            <input
              className="w-full rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={!editable || isPending}
              inputMode="numeric"
              type="number"
              placeholder="e.g. 27"
            />
          </div>

          <div>
            <label className="block text-xs opacity-70 mb-1">Gender</label>
            <input
              className="w-full rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={!editable || isPending}
              placeholder="e.g. Female"
            />
          </div>

          <div>
            <label className="block text-xs opacity-70 mb-1">Occupation</label>
            <input
              className="w-full rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              disabled={!editable || isPending}
              placeholder="e.g. Fixer / Runner"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs opacity-70 mb-1">Appearance</label>
          <textarea
            className="w-full min-h-[140px] rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
            value={appearance}
            onChange={(e) => setAppearance(e.target.value)}
            disabled={!editable || isPending}
            placeholder="Describe appearance..."
          />
        </div>

        <div>
          <label className="block text-xs opacity-70 mb-1">Personality</label>
          <textarea
            className="w-full min-h-[140px] rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            disabled={!editable || isPending}
            placeholder="Describe personality..."
          />
        </div>

        <div>
          <label className="block text-xs opacity-70 mb-1">Background</label>
          <textarea
            className="w-full min-h-[180px] rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            disabled={!editable || isPending}
            placeholder="Write background story..."
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!editable || isPending}
              className="rounded-md border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-50"
            >
              {isPending ? "Working…" : "Save"}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!editable || isPending}
              className="rounded-md border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-50"
            >
              Submit
            </button>
          </div>

          <div className="text-xs">
            {!editable ? (
              <span className="opacity-60">Locked (cannot edit in this status)</span>
            ) : hint ? (
              <span className="text-emerald-300">{hint}</span>
            ) : null}
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
    </div>
  );
}
