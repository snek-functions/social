import * as PQ from "@prisma/client";
import { prisma } from "../prisma";
import { Post } from "./Post.repository";

export class Profile implements PQ.Profile {
  id: string;
  userId: string;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PQ.Profile) {
    for (const key in data) {
      this[key] = data[key];
    }
  }

  async posts() {
    const posts = await prisma.profile.findUnique({
      where: {
        id: this.id,
      },
      select: {
        posts: true,
      },
    });

    return posts ? posts.posts.map((post) => new Post(post)) : [];
  }

  async starredPosts() {
    const starredPosts = await prisma.profile.findUnique({
      where: {
        id: this.id,
      },
      select: {
        starredPosts: {
          select: {
            post: true,
            createdAt: true,
          },
        },
      },
    });

    return starredPosts
      ? starredPosts.starredPosts.map(({ post, createdAt }) => {
          return {
            post: () => new Post(post),
            createdAt,
          };
        })
      : [];
  }

  async followers() {
    const followers = await prisma.profile.findUnique({
      where: {
        id: this.id,
      },
      select: {
        followers: {
          select: {
            follower: true,
          },
        },
      },
    });

    return followers
      ? followers.followers.map(
          (followerConnection) => new Profile(followerConnection.follower)
        )
      : [];
  }

  async following() {
    const following = await prisma.profile.findUnique({
      where: {
        id: this.id,
      },
      select: {
        following: {
          select: {
            followed: true,
          },
        },
      },
    });

    return following
      ? following.following.map(
          (followingConnection) => new Profile(followingConnection.followed)
        )
      : [];
  }

  async activity(): Promise<
    {
      createdAt: string;
      type: string;

      post?: Post | null;
      follow?: {
        createdAt: Date;
        followed: Profile;
      };
    }[]
  > {
    const activity = await prisma.profile.findUnique({
      where: {
        id: this.id,
      },
      select: {
        Activity: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            post: true,
            follow: {
              include: {
                followed: true,
              },
            },
          },
        },
      },
    });

    return activity
      ? activity.Activity.map(
          ({
            createdAt,
            type,
            post,
            follow,
          }: {
            createdAt: Date;
            type: string;
            post: PQ.Post | null;
            follow: {
              createdAt: Date;
              followed: PQ.Profile;
            } | null;
          }) => {
            return {
              createdAt: createdAt.toISOString(),
              type,
              post: post ? new Post(post) : null,
              follow: follow
                ? {
                    createdAt: follow.createdAt,
                    followed: new Profile(follow.followed),
                  }
                : undefined,
            };
          }
        )
      : ([] as any);
  }

  async views() {
    const views = await prisma.profileStatistic.aggregate({
      where: {
        profileId: this.id,
      },
      _sum: {
        profileViews: true,
      },
    });

    return views._sum.profileViews || 0;
  }
}

export interface ProfileData {
  bio: string | null;
}

export interface ProfileUpdateData {
  bio?: string | null;
}

export class ProfileRepository {
  constructor(private readonly prismaProfile: PQ.PrismaClient["profile"]) {}

  async create(userId: string) {
    const profile = await this.prismaProfile.create({
      data: {
        userId,
      },
    });

    return new Profile(profile);
  }

  async update(profileId: string, values: ProfileUpdateData) {
    const profile = await this.prismaProfile.update({
      where: {
        id: profileId,
      },
      data: {
        ...values,
      },
    });

    return new Profile(profile);
  }

  async delete(profileId: string) {
    return await this.prismaProfile.delete({
      where: {
        id: profileId,
      },
      select: {
        id: true,
      },
    });
  }

  async find(profileId: string) {
    const profile = await this.prismaProfile.findUniqueOrThrow({
      where: {
        id: profileId,
      },
    });

    return new Profile(profile);
  }

  async profileIdByUserId(userId: string) {
    const profile = await this.prismaProfile.findUniqueOrThrow({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    return profile.id;
  }

  async findAll() {
    const profiles = await this.prismaProfile.findMany();

    return profiles.map((profile) => new Profile(profile));
  }

  async registerView(profileId: string) {
    await prisma.profileStatistic.upsert({
      where: {
        profileId_createdAt: {
          profileId,
          createdAt: new Date().toISOString(),
        },
      },
      update: {
        profileViews: {
          increment: 1,
        },
      },
      create: {
        profileId,
        profileViews: 1,
      },
    });

    return true;
  }
}

export const profileRepository = new ProfileRepository(prisma.profile);
