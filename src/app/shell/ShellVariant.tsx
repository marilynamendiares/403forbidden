"use client";

import { useEffect, useId } from "react";
import { ShellVariant, useShellVariant } from "./ShellVariantContext";

export default function ShellVariantSetter({ variant }: { variant: ShellVariant }) {
  const { registerVariant, unregisterVariant } = useShellVariant();
  const id = useId();

  useEffect(() => {
    registerVariant(id, variant);
    return () => unregisterVariant(id);
  }, [registerVariant, unregisterVariant, variant]);

  return null;
}
