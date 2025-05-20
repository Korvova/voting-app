-- AlterTable
ALTER TABLE "AgendaItem" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voting" BOOLEAN NOT NULL DEFAULT false;
