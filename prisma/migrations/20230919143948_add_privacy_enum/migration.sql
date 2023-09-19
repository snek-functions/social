/*
  Warnings:

  - The `privacy` column on the `Post` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Privacy" AS ENUM ('PUBLIC', 'PRIVATE', 'FRIENDS');

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "privacy",
ADD COLUMN     "privacy" "Privacy" NOT NULL DEFAULT 'PRIVATE';
