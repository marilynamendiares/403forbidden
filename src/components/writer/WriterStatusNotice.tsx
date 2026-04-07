"use client";

export function WriterStatusNotice({
  message,
  tone = "warning",
}: {
  message: string | null;
  tone?: "warning" | "muted";
}) {
  if (!message) return null;

  const className =
    tone === "muted"
      ? "rounded-md border border-neutral-700/60 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-300"
      : "rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-amber-200";

  return <div className={className}>{message}</div>;
}
