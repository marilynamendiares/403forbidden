-- 1) Добавим username в User (пока NULLABLE), и таймстемпы в Profile с дефолтом
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2) Бэкофилл username:
-- 2.1) Если колонка Profile.username ещё существует — копируем из неё
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='Profile' AND column_name='username'
  ) THEN
    UPDATE "User" u
    SET "username" = lower(regexp_replace(p."username", '[^a-z0-9_.]', '_', 'g'))
    FROM "Profile" p
    WHERE p."userId" = u."id" AND u."username" IS NULL;
  END IF;
END$$;

-- 2.2) Для оставшихся — из local-part email
UPDATE "User"
SET "username" = lower(regexp_replace(split_part("email", '@', 1), '[^a-z0-9_.]', '_', 'g'))
WHERE "username" IS NULL;

-- 2.3) Заполним совсем пустые/короткие
UPDATE "User"
SET "username" = 'user_' || substr("id", 1, 8)
WHERE ("username" IS NULL OR length("username") < 3);

-- 2.4) Уберём дубликаты (суффикс из кусочка id)
WITH d AS (
  SELECT "id","username",
         ROW_NUMBER() OVER (PARTITION BY "username" ORDER BY "createdAt","id") rn
  FROM "User"
)
UPDATE "User" u
SET "username" = u."username" || '_' || substr(u."id", 1, 4)
FROM d
WHERE u."id" = d."id" AND d.rn > 1;

-- 3) Зажмём ограничения (NOT NULL + UNIQUE)
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
-- Prisma создаст уникальный индекс, но на всякий случай:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'User_username_key'
  ) THEN
    CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
  END IF;
END$$;

-- 4) Удалим Profile.username, если ещё есть (мы перенесли его в User)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='Profile' AND column_name='username'
  ) THEN
    ALTER TABLE "Profile" DROP COLUMN "username";
  END IF;
END$$;
