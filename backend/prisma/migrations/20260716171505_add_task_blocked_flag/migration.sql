-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockedNote" TEXT NOT NULL DEFAULT '';
