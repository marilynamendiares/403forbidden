"use client";

import { useEffect } from "react";
import { ShellVariant, useShellVariant } from "./ShellVariantContext";

export default function ShellVariantSetter({ variant }: { variant: ShellVariant }) {
  const { variant: prev, setVariant } = useShellVariant();

  useEffect(() => {
    const before = prev;
    setVariant(variant);
    return () => setVariant(before);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  return null;
}
