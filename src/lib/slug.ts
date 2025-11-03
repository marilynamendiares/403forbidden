// src/lib/slug.ts
export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // снять диакритику
      .replace(/[^a-z0-9]+/g, "-")     // не латиница/цифры → дефис
      .replace(/^-+|-+$/g, "")         // обрезать дефисы по краям
      .slice(0, 64) || "book"          // fallback если пусто
  );
}
