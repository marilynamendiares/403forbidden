"use client";

import { useEffect, useState } from "react";

export default function BrandMark({ text = "403 Forbidden" }: { text?: string }) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setOn((v) => !v), 650);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1">
      <span>{text}</span>
      <span className={on ? "opacity-100" : "opacity-0"}>_</span>
    </span>
  );
}
