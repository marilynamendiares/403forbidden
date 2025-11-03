"use client";
import { useRouter } from "next/navigation";
import { useEventStream } from "@/hooks/useEventStream";

export default function BooksLiveClient() {
  const router = useRouter();

  useEventStream({
    "book:created":   () => router.refresh(),
    "book:deleted":   () => router.refresh(),
    "book:updated":   () => router.refresh(),     // переименовали, поменяли статус и т.п.
    "book:published": () => router.refresh(),     // если у книги есть publish
    // "book:list_changed": () => router.refresh(), // если захочешь единый сигнал
  });

  return null;
}
