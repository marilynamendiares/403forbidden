-- CreateEnum
CREATE TYPE "ForumReadVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'PLAYERS');

-- CreateEnum
CREATE TYPE "ForumWriteVisibility" AS ENUM ('MEMBERS', 'PLAYERS', 'ADMIN');

-- AlterTable
ALTER TABLE "ForumCategory" ADD COLUMN     "createPostVisibility" "ForumWriteVisibility" NOT NULL DEFAULT 'MEMBERS',
ADD COLUMN     "createThreadVisibility" "ForumWriteVisibility" NOT NULL DEFAULT 'PLAYERS',
ADD COLUMN     "readVisibility" "ForumReadVisibility" NOT NULL DEFAULT 'MEMBERS';
