-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "VoteResult" ADD COLUMN     "voteType" "VoteType" DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "VoteTemplate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoteTemplate_pkey" PRIMARY KEY ("id")
);
