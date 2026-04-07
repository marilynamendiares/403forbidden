"use client";

import { useEffect } from "react";

type RefTarget = HTMLElement | null;

export function useClickOutside(
  ref: React.RefObject<RefTarget>,
  enabled: boolean,
  onOutsideClick: () => void
) {
  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (event: MouseEvent) => {
      const node = ref.current;
      if (!node) return;
      if (!node.contains(event.target as Node)) {
        onOutsideClick();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [enabled, onOutsideClick, ref]);
}
