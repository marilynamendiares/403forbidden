"use client";

import { useCallback, useEffect, useRef } from "react";

export function useStableEvent<T extends (...args: never[]) => unknown>(fn: T): T {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback(((...args: Parameters<T>) => fnRef.current(...args)) as T, []);
}
