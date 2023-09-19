-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'DE');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "language" "Language" NOT NULL DEFAULT 'EN';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "language" "Language" NOT NULL DEFAULT 'EN';
