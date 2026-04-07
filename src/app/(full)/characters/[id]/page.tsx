// src/app/characters/[id]/page.tsx
"use client";

import { use, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildCharacterFormPayload,
  isEditableCharacterStatus,
} from "@/lib/characterApplication";
import {
  submitCharacterApplication,
  updateCharacterApplication,
} from "@/lib/characterApplicationClient";
import { useCharacterApplicationItem } from "@/hooks/useCharacterApplicationItem";
import {
  CharacterApplicationForm,
  CharacterApplicationModeratorNote,
} from "@/components/characters/CharacterApplicationUi";

type Props = { params: Promise<{ id: string }> };

export default function CharacterEditPage({ params }: Props) {
  const router = useRouter();
  const { id } = use(params);
  const { item, errorMessage, isLoading, refresh } = useCharacterApplicationItem(id);

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

  const editable = useMemo(() => isEditableCharacterStatus(item?.status), [item?.status]);

  useEffect(() => {
    if (!item) return;

    setName(item.name ?? "");

    const form = item.form ?? {};
    if (form.age === null || form.age === undefined) setAge("");
    else setAge(String(form.age));

    setGender(form.gender ?? "");
    setOccupation(form.occupation ?? "");
    setAppearance(form.appearance ?? "");
    setPersonality(form.personality ?? "");
    setBackground(form.background ?? "");
  }, [item]);

  async function save() {
    if (!item || !editable || isPending) return;
    setError("");
    setHint("");

    const formResult = buildCharacterFormPayload({
      age,
      gender,
      occupation,
      appearance,
      personality,
      background,
    });
    if (!formResult.ok) {
      setError(formResult.error);
      return;
    }

    startTransition(async () => {
      try {
        await updateCharacterApplication(id, {
          name: name.trim(),
          form: formResult.form,
        });
        setHint("Saved.");
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Save failed");
        return;
      }
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

    const formResult = buildCharacterFormPayload({
      age,
      gender,
      occupation,
      appearance,
      personality,
      background,
    });
    if (!formResult.ok) {
      setError(formResult.error);
      return;
    }

    startTransition(async () => {
      // optional: save latest before submit (без доп. UX)
      await updateCharacterApplication(id, {
          name: name.trim(),
          form: formResult.form,
      }).catch(() => {});

      try {
        await submitCharacterApplication(id);
        setHint("Submitted.");
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Submit failed");
        return;
      }
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

      {errorMessage && !error ? <div className="text-sm text-rose-400">{errorMessage}</div> : null}
      {isLoading && !item ? <div className="text-sm opacity-60">Loading…</div> : null}

      {item?.moderatorNote ? <CharacterApplicationModeratorNote note={item.moderatorNote} /> : null}

      <div className="rounded-xl border border-neutral-900 p-4 space-y-5">
        <CharacterApplicationForm
          value={{
            name,
            age,
            gender,
            occupation,
            appearance,
            personality,
            background,
          }}
          handlers={{
            onNameChange: setName,
            onAgeChange: setAge,
            onGenderChange: setGender,
            onOccupationChange: setOccupation,
            onAppearanceChange: setAppearance,
            onPersonalityChange: setPersonality,
            onBackgroundChange: setBackground,
          }}
          disabled={!editable || isPending}
        />

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
