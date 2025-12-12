# 403forbidden — Архитектура (v1)

## Слои
- **fragments/** — Prisma `select`-фрагменты (одна «истина» какие поля читаем).
- **dto.ts, contracts.ts** — формы данных наружу (DTO) + общие типы (Cursor, Paged, Events).
- **repos/** — ВСЯ работа с БД и доменной логикой (ACL, пагинации, события). Страницы и API ходят ТОЛЬКО сюда.
- **schemas.ts** — zod-схемы входящих тел (Create*, Patch*).
- **events/** — типы payload’ов SSE.
- **app/** — страницы/роуты Next. Server Components ОБЯЗАТЕЛЬНО `await params/searchParams`.

## Инварианты
- Автор всегда: `User.username`, `Profile.displayName/avatarUrl`.
- Даты наружу — **строки ISO**.
- Любые списки — через `Paged<T>`.
- SSE-пейлоады — строго по типам из `contracts.ts`.
