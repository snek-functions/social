import * as PQ from "@prisma/client";
import { prisma } from "../prisma";

export class ActivityRepository {
  constructor(private readonly prismaActivity: PQ.PrismaClient["activity"]) {}

  createProfileActivity = async (profileId: string, type: "create") => {
    const activity = await this.prismaActivity.create({
      data: {
        profileId,
        type: `profile_${type}`,
      },
    });

    return activity;
  };

  createBlogActivity = async (
    profileId: string,
    postId: string,
    type: "create"
  ) => {
    const activity = await this.prismaActivity.create({
      data: {
        profileId,
        postId,
        type: `blog_${type}`,
      },
    });

    return activity;
  };

  createBlogStarActivity = async (
    profileId: string,
    postId: string,
    type: "star" | "unstar"
  ) => {
    const activity = await this.prismaActivity.create({
      data: {
        profileId,
        postId,
        type: `star_${type}`,
      },
    });

    return activity;
  };

  createProfileFollowActivity = async (
    profileId: string,
    followId: string,
    type: "follow"
  ) => {
    const activity = await this.prismaActivity.create({
      data: {
        profileId,
        followId: followId,
        type: `follow_${type}`,
      },
    });

    return activity;
  };
}

export const activityRepository = new ActivityRepository(prisma.activity);
