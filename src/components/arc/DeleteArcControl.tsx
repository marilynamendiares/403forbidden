"use client";

import { useState } from "react";

export function DeleteArcControl({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-neutral-500 transition-colors hover:text-red-500"
      >
        Delete arc
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      <p className="text-xs text-neutral-500">
        Are you sure you want to delete this arc?
      </p>
      <div className="flex items-center gap-3 text-xs">
        <form action={action}>
          <button
            type="submit"
            className="text-neutral-500 transition-colors hover:text-red-500"
          >
            Yes
          </button>
        </form>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-neutral-500 transition-colors hover:text-[#2D2D2D]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
