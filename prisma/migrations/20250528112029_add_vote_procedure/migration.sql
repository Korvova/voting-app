-- CreateTable
CREATE TABLE "VoteProcedure" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "resultIfTrue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoteProcedure_pkey" PRIMARY KEY ("id")
);
