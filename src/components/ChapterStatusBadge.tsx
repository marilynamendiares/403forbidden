// src/components/ChapterStatusBadge.tsx
import React from "react";

export function ChapterStatusBadge({ status }: { status: "OPEN" | "CLOSED" }) {
  const isOpen = status === "OPEN";
  const label = isOpen ? "OPEN" : "COMPLETED";

  return (
    <span
      className={
        // inline + baseline = ровно по строке
        "inline align-baseline font-medium " +
        (isOpen ? "text-emerald-400" : "text-neutral-400")
      }
      // важное: взять размер и line-height у родителя (<p class="text-sm ...">)
      style={{ fontSize: "inherit", lineHeight: "inherit" }}
    >
      {label}
    </span>
  );
}
