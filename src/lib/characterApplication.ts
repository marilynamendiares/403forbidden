export type CharacterApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEEDS_CHANGES"
  | "APPROVED";

export type CharacterForm = {
  age?: number | null;
  gender?: string;
  occupation?: string;
  visualRefUrl?: string;
  appearance?: string;
  personality?: string;
  background?: string;
};

export function isEditableCharacterStatus(status?: CharacterApplicationStatus | null) {
  return status === "DRAFT" || status === "NEEDS_CHANGES";
}

export function validateCharacterAgeInput(
  input: string
): { ok: true; value: number | null } | { ok: false; error: string } {
  const trimmed = input.trim();

  if (trimmed === "") {
    return { ok: true, value: null };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: "Age must be a number" };
  }

  if (!Number.isInteger(value)) {
    return { ok: false, error: "Age must be an integer" };
  }

  if (value < 0 || value > 999) {
    return { ok: false, error: "Age looks invalid" };
  }

  return { ok: true, value };
}

type CharacterFormFieldsInput = {
  age: string;
  gender: string;
  occupation: string;
  visualRefUrl: string;
  appearance: string;
  personality: string;
  background: string;
};

export function buildCharacterFormPayload(
  fields: CharacterFormFieldsInput
): { ok: true; form: CharacterForm } | { ok: false; error: string } {
  const ageCheck = validateCharacterAgeInput(fields.age);
  if (!ageCheck.ok) {
    return ageCheck;
  }

  return {
    ok: true,
    form: {
      age: ageCheck.value,
      gender: fields.gender.trim(),
      occupation: fields.occupation.trim(),
      visualRefUrl: fields.visualRefUrl.trim(),
      appearance: fields.appearance.trim(),
      personality: fields.personality.trim(),
      background: fields.background.trim(),
    },
  };
}
