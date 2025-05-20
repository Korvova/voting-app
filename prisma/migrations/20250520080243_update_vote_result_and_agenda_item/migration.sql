/*
  Warnings:

  - You are about to drop the column `endTime` on the `VoteResult` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VoteResult" DROP COLUMN "endTime",
ADD COLUMN     "duration" INTEGER;
