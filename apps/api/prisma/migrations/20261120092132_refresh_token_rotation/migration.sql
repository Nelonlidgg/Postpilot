/*
  Warnings:

  - You are about to drop the column `replacedById` on the `sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "replacedById";

-- CreateTable
CREATE TABLE "used_refresh_tokens" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sessionId" UUID NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "used_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "used_refresh_tokens_tokenHash_key" ON "used_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "used_refresh_tokens_sessionId_idx" ON "used_refresh_tokens"("sessionId");

-- AddForeignKey
ALTER TABLE "used_refresh_tokens" ADD CONSTRAINT "used_refresh_tokens_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
