// src/lib/format.ts
export function formatDate(dt: string | Date) {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  // локально можно заменить на нужную локаль
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
