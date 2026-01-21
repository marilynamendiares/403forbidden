"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  fallbackHref = "/forum",
  className = "text-sm opacity-70 hover:underline",
  label = "← Back",
}: {
  fallbackHref?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // Если есть история в текущей вкладке — назад.
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        // Если зашли напрямую/новая вкладка — в fallback.
        router.push(fallbackHref);
      }}
      className={className}
    >
      {label}
    </button>
  );
}
