// src/server/fragments.ts
import type { Prisma } from "@prisma/client";

/**
 * Единый фрагмент выборки автора (User) для списков/постов/тредов.
 * - Берём минимально необходимое: id, username и публичные поля из Profile.
 * - Никаких email здесь — это публичные DTO.
 */
export const userAuthorSelect = {
  id: true,
  username: true,
  profile: {
    select: {
      displayName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.UserSelect;

// Если позже понадобится — можно добавлять другие фрагменты здесь,
// НО избегаем дубликатов имён экспортов.
