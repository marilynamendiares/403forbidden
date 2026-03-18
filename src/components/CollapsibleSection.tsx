// src/components/CollapsibleSection.tsx
"use client";

import { useState, type ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
};

export default function CollapsibleSection({
  label,
  children,
  defaultOpen = false,
  className,
  buttonClassName,
  panelClassName,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const icon = open ? "–" : "+"; // переключение + / –

  return (
    <section className={["mt-6", className].filter(Boolean).join(" ")}>
      {/* компактная строгая кнопка */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-950/40 px-3 py-1.5 text-sm text-neutral-200 transition hover:bg-neutral-900",
          buttonClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="text-lg leading-none">{icon}</span>
        <span>{label}</span>
      </button>

      {/* контент секции */}
      {open && (
        <div
          className={[
            "mt-3 rounded-md border border-neutral-800 bg-neutral-950/40 p-4 animate-fadeIn",
            panelClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
      )}
    </section>
  );
}
