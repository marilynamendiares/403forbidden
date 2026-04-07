"use client";

export function ChapterStatusSummary({
  publicationLabel,
  progressLabel,
  minutes,
  words,
}: {
  publicationLabel: string;
  progressLabel: string;
  minutes: number;
  words: number;
}) {
  return (
    <div className="header-font-archimoto mt-8 grid gap-2 text-[15px] font-thin leading-none uppercase text-[#666666]">
      <div className="flex items-center gap-2">
        <span>{publicationLabel}</span>
        <span>/</span>
        <span>{progressLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>
          ~{minutes} min read / {words} words
        </span>
      </div>
    </div>
  );
}
