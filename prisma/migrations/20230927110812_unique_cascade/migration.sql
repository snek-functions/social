-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followedId_fkey";

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followerId_fkey";

-- DropForeignKey
ALTER TABLE "PostStatistic" DROP CONSTRAINT "PostStatistic_postId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileStatistic" DROP CONSTRAINT "ProfileStatistic_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Star" DROP CONSTRAINT "Star_postId_fkey";

-- DropForeignKey
ALTER TABLE "Star" DROP CONSTRAINT "Star_profileId_fkey";

-- AddForeignKey
ALTER TABLE "ProfileStatistic" ADD CONSTRAINT "ProfileStatistic_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostStatistic" ADD CONSTRAINT "PostStatistic_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followedId_fkey" FOREIGN KEY ("followedId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
