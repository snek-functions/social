/*
  Warnings:

  - Added the required column `avatarUrl` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "avatarUrl" TEXT NOT NULL;
