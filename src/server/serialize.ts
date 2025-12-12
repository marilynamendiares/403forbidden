// src/server/serialize.ts
export const iso = (d: Date | null | undefined) => d ? d.toISOString() : null;
