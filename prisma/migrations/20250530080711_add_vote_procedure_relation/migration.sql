-- AddForeignKey
ALTER TABLE "VoteResult" ADD CONSTRAINT "VoteResult_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "VoteProcedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
