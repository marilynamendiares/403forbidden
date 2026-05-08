"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

const Ctx = createContext<{
  node: React.ReactNode;
  setNode: (node: React.ReactNode) => void;
} | null>(null);

export function ShellRightRailProvider({ children }: { children: React.ReactNode }) {
  const [node, setNode] = useState<React.ReactNode>(null);
  const value = useMemo(() => ({ node, setNode }), [node]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellRightRail() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useShellRightRail must be used within ShellRightRailProvider");
  return value;
}
