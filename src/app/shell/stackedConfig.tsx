"use client";

import { useCallback, useId, useMemo, useState, useEffect } from "react";

type StackedEntry<T> = {
  id: string;
  value: T;
};

export function useStackedConfigValue<T>(defaultValue: T) {
  const [entries, setEntries] = useState<Array<StackedEntry<T>>>([]);

  const registerValue = useCallback((id: string, value: T) => {
    setEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      next.push({ id, value });
      return next;
    });
  }, []);

  const unregisterValue = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const value = entries.length > 0 ? entries[entries.length - 1]!.value : defaultValue;

  return useMemo(
    () => ({ value, registerValue, unregisterValue }),
    [registerValue, unregisterValue, value]
  );
}

export function useStackedConfigRegistration<T>(
  registerValue: (id: string, value: T) => void,
  unregisterValue: (id: string) => void,
  value: T
) {
  const id = useId();

  useEffect(() => {
    registerValue(id, value);
    return () => unregisterValue(id);
  }, [id, registerValue, unregisterValue, value]);
}
