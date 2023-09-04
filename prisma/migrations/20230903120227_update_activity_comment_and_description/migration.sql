/*
  Warnings:

  - You are about to drop the column `comment` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Activity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "comment",
DROP COLUMN "description";
