"use client";

import { useEffect, useState } from "react";

type Props = {
  text?: string;
  tail?: string; // например "_" или "<"
  blinkMs?: number;
};

export default function BrandMark({
  text = "403 Forbidden",
  tail = "_",
  blinkMs = 1300,
}: Props) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setOn((v) => !v), blinkMs);
    return () => window.clearInterval(id);
  }, [blinkMs]);

  return (
    <span className="inline-flex items-center gap-1">
      <span>{text}</span>
      <span className={on ? "opacity-100" : "opacity-0"}>{tail}</span>
    </span>
  );
}
