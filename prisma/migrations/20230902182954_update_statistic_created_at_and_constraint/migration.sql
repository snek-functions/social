/*
  Warnings:

  - A unique constraint covering the columns `[postId,createdAt]` on the table `PostStatistic` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[profileId,createdAt]` on the table `ProfileStatistic` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PostStatistic" ALTER COLUMN "createdAt" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "ProfileStatistic" ALTER COLUMN "createdAt" SET DATA TYPE DATE;

-- CreateIndex
CREATE UNIQUE INDEX "PostStatistic_postId_createdAt_key" ON "PostStatistic"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileStatistic_profileId_createdAt_key" ON "ProfileStatistic"("profileId", "createdAt");
