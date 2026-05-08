"use client";

import { useEffect } from "react";
import { useShellRightRail } from "./ShellRightRailContext";

export default function ShellRightRailSlot({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setNode } = useShellRightRail();

  useEffect(() => {
    setNode(children);
    return () => setNode(null);
  }, [children, setNode]);

  return null;
}
