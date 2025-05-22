-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "voteResultId" INTEGER;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voteResultId_fkey" FOREIGN KEY ("voteResultId") REFERENCES "VoteResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
