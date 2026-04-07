"use client";

import { useEffect, useState } from "react";

type Props = {
  text?: string;
  tail?: string; // например "_" или "<"
  blinkMs?: number;
  className?: string;
  textClassName?: string;
  tailClassName?: string;
};

export default function BrandMark({
  text = "403 Forbidden",
  tail = "_",
  blinkMs = 1300,
  className,
  textClassName,
  tailClassName,
}: Props) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setOn((v) => !v), blinkMs);
    return () => window.clearInterval(id);
  }, [blinkMs]);

  return (
    <span className={["relative inline-flex items-center", className].filter(Boolean).join(" ")}>
      <span className={textClassName}>{text}</span>
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none absolute left-full ml-1",
          on ? "opacity-100" : "opacity-0",
          tailClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {tail}
      </span>
    </span>
  );
}
