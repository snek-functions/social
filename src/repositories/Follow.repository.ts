import * as PQ from "@prisma/client";

import { prisma } from "../prisma";

export class FollowRepository {
  constructor(private readonly prismaProfile: PQ.PrismaClient["follow"]) {}

  follow = async (profileId: string, followId: string) => {
    const follow = await this.prismaProfile.create({
      data: {
        followerId: profileId,
        followedId: followId,
      },
    });

    return follow;
  };

  unfollow = async (profileId: string, followId: string) => {
    const follow = await this.prismaProfile.delete({
      where: {
        followerId_followedId: {
          followerId: profileId,
          followedId: followId,
        },
      },
    });

    return follow;
  };

  checkFollow = async (profileId: string, followId: string) => {
    const follow = await this.prismaProfile.findUnique({
      where: {
        followerId_followedId: {
          followerId: profileId,
          followedId: followId,
        },
      },
    });

    return follow;
  };
}

export const followRepository = new FollowRepository(prisma.follow);
