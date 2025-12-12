// src/components/BooksLiveClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/useRealtime";

export default function BooksLiveClient() {
  const router = useRouter();

  // Любое событие о книгах → мягкий refresh страницы
  useRealtime(
    ["book:created", "book:deleted", "book:updated", "book:published"],
    () => router.refresh(),
  );

  return null;
}
