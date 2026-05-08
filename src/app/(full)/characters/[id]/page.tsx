// src/app/characters/[id]/page.tsx
"use client";

import { use, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearDraft, readDraft, writeDraft } from "@/lib/draftStorage";
import { getWriterSaveErrorMessage, getWriterStatusLabel } from "@/lib/writerStatus";
import { uploadEditorImage } from "@/lib/imageUploadClient";
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
import { WriterStatusNotice } from "@/components/writer/WriterStatusNotice";

type Props = { params: Promise<{ id: string }> };

type CharacterApplicationLocalDraft = {
  name?: string;
  age?: string;
  gender?: string;
  occupation?: string;
  visualRefUrl?: string;
  appearance?: string;
  personality?: string;
  background?: string;
};

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
  const [visualRefUrl, setVisualRefUrl] = useState("");
  const [appearance, setAppearance] = useState("");
  const [personality, setPersonality] = useState("");
  const [background, setBackground] = useState("");

  const [error, setError] = useState("");
  const [hint, setHint] = useState<string>("");
  const [baseline, setBaseline] = useState<CharacterApplicationLocalDraft | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [visualRefBusy, setVisualRefBusy] = useState(false);

  const [isPending, startTransition] = useTransition();

  const editable = useMemo(() => isEditableCharacterStatus(item?.status), [item?.status]);
  const draftKey = useMemo(() => `character_application_draft:${id}`, [id]);
  const currentDraft = useMemo(
    () => ({
      name,
      age,
      gender,
      occupation,
      visualRefUrl,
      appearance,
      personality,
      background,
    }),
    [name, age, gender, occupation, visualRefUrl, appearance, personality, background]
  );
  const dirty = useMemo(() => {
    if (!baseline) return false;
    return JSON.stringify(currentDraft) !== JSON.stringify(baseline);
  }, [baseline, currentDraft]);
  const hasDraftState = draftRestored || dirty || saveState === "saving" || saveState === "saved";
  const statusLabel = getWriterStatusLabel({
    draftRestored,
    hasDraftState,
    saveState,
    dirty,
  });

  useEffect(() => {
    if (!item) return;

    const form = item.form ?? {};
    const nextBaseline = {
      name: item.name ?? "",
      age: form.age === null || form.age === undefined ? "" : String(form.age),
      gender: form.gender ?? "",
      occupation: form.occupation ?? "",
      visualRefUrl: form.visualRefUrl ?? "",
      appearance: form.appearance ?? "",
      personality: form.personality ?? "",
      background: form.background ?? "",
    };

    setBaseline(nextBaseline);

    const parsed = editable ? readDraft<CharacterApplicationLocalDraft>(draftKey) : null;
    const hasLocalDraft =
      parsed &&
      Object.values(parsed).some((value) => typeof value === "string" && value.trim().length > 0) &&
      JSON.stringify(parsed) !== JSON.stringify(nextBaseline);

    const source = hasLocalDraft ? { ...nextBaseline, ...parsed } : nextBaseline;

    setName(source.name ?? "");
    setAge(source.age ?? "");
    setGender(source.gender ?? "");
    setOccupation(source.occupation ?? "");
    setVisualRefUrl(source.visualRefUrl ?? "");
    setAppearance(source.appearance ?? "");
    setPersonality(source.personality ?? "");
    setBackground(source.background ?? "");
    setDraftRestored(Boolean(hasLocalDraft));
    setSaveState(hasLocalDraft ? "saved" : "idle");
    setError("");
  }, [item, editable, draftKey]);

  useEffect(() => {
    if (!editable || !baseline) return;

    if (!dirty) {
      clearDraft(draftKey);
      setDraftRestored(false);
      setSaveState("idle");
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(() => {
      if (writeDraft(draftKey, currentDraft)) {
        setSaveState("saved");
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [editable, baseline, dirty, draftKey, currentDraft]);

  function discardLocalDraft() {
    if (!baseline) return;
    clearDraft(draftKey);
    setName(baseline.name ?? "");
    setAge(baseline.age ?? "");
    setGender(baseline.gender ?? "");
    setOccupation(baseline.occupation ?? "");
    setVisualRefUrl(baseline.visualRefUrl ?? "");
    setAppearance(baseline.appearance ?? "");
    setPersonality(baseline.personality ?? "");
    setBackground(baseline.background ?? "");
    setDraftRestored(false);
    setSaveState("idle");
    setError("");
  }

  async function uploadVisualRef(file: File) {
    if (!editable || isPending || visualRefBusy) return;

    setError("");
    setHint("");
    setVisualRefBusy(true);

    try {
      const url = await uploadEditorImage(file);
      setVisualRefUrl(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setVisualRefBusy(false);
    }
  }

  function removeVisualRef() {
    if (!editable || isPending || visualRefBusy) return;
    setVisualRefUrl("");
    setError("");
    setHint("");
  }

  async function save() {
    if (!item || !editable || isPending) return;
    setError("");
    setHint("");

    const formResult = buildCharacterFormPayload({
      age,
      gender,
      occupation,
      visualRefUrl,
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
        clearDraft(draftKey);
        setDraftRestored(false);
        setSaveState("idle");
        setBaseline(currentDraft);
        setHint("Saved.");
        await refresh();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Save failed";
        setError(getWriterSaveErrorMessage(message, "character application"));
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

    if (!visualRefUrl.trim()) {
      setError("Visual ref is required before submitting the character application.");
      return;
    }

    const formResult = buildCharacterFormPayload({
      age,
      gender,
      occupation,
      visualRefUrl,
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

        await submitCharacterApplication(id);
        clearDraft(draftKey);
        setDraftRestored(false);
        setSaveState("idle");
        setBaseline(currentDraft);
        setHint("Submitted.");
        await refresh();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Submit failed";
        setError(getWriterSaveErrorMessage(message, "character application"));
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
            visualRefUrl,
            appearance,
            personality,
            background,
          }}
          handlers={{
            onNameChange: setName,
            onAgeChange: setAge,
            onGenderChange: setGender,
            onOccupationChange: setOccupation,
            onVisualRefUpload: uploadVisualRef,
            onVisualRefRemove: removeVisualRef,
            onAppearanceChange: setAppearance,
            onPersonalityChange: setPersonality,
            onBackgroundChange: setBackground,
          }}
          disabled={!editable || isPending}
          visualRefBusy={visualRefBusy}
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
            ) : hasDraftState ? (
              <span className="opacity-60">{statusLabel}</span>
            ) : null}
          </div>
        </div>

        {editable && hasDraftState ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={discardLocalDraft}
              className="text-xs opacity-60 hover:opacity-100"
            >
              discard local draft
            </button>
          </div>
        ) : null}

        <WriterStatusNotice message={error || null} />
      </div>
    </div>
  );
}
