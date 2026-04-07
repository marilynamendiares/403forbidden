export function getWriterStatusLabel(input: {
  draftRestored: boolean;
  hasDraftState: boolean;
  saveState: "idle" | "saving" | "saved";
  dirty: boolean;
  lastSavedAt?: number | null;
}) {
  const { draftRestored, hasDraftState, saveState, dirty, lastSavedAt } = input;

  if (draftRestored) return "local draft restored";
  if (saveState === "saving") return "saving local draft";

  if (saveState === "saved" && typeof lastSavedAt === "number") {
    const sec = Math.max(0, Math.round((Date.now() - lastSavedAt) / 1000));
    if (sec <= 2) return "draft saved just now";
    return `draft saved ${sec}s ago`;
  }

  if (hasDraftState || dirty) return "draft saved";
  return "no local changes";
}

export function getWriterSaveErrorMessage(message: string, subject: string) {
  return `${message || `Failed to save ${subject}.`} Your local draft is still stored in this browser.`;
}
