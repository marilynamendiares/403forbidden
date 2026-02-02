// src/components/LayoutContainer.tsx
import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function LayoutContainer({ children, className = "" }: Props) {
  return (
    <div
      className={[
        "mx-auto w-full max-w-[clamp(1100px,calc(100vw-64px),2320px)] px-8",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
