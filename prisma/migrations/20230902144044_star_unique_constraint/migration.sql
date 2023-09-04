/*
  Warnings:

  - A unique constraint covering the columns `[postId,profileId]` on the table `Star` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Star_postId_profileId_key" ON "Star"("postId", "profileId");
