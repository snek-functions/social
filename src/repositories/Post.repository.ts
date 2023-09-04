import * as PQ from "@prisma/client";
import { prisma } from "../prisma";
import { Profile } from "./Profile.repository";

export type Privacy = "public" | "private" | "friends";

export class Post implements PQ.Post {
  id: string;
  title: string;
  avatarURL: string | null;
  summary: string | null;
  content: string | null;
  profileId: string;
  createdAt: Date;
  updatedAt: Date;
  privacy: Privacy;

  constructor(data: PQ.Post) {
    for (const key in data) {
      this[key] = data[key];
    }
  }

  profile = async () => {
    const data = await prisma.post.findUnique({
      where: {
        id: this.id,
      },
      select: {
        profile: true,
      },
    });

    return data ? new Profile(data.profile) : null;
  };

  stars = async () => {
    const stars = await prisma.post.findUnique({
      where: {
        id: this.id,
      },
      select: {
        stars: {
          select: {
            profile: true,
            createdAt: true,
          },
        },
      },
    });

    return stars
      ? stars.stars.map((star) => {
          return {
            profile: () => new Profile(star.profile),
            createdAt: star.createdAt,
          };
        })
      : [];
  };

  async views() {
    const views = await prisma.postStatistic.aggregate({
      where: {
        postId: this.id,
      },
      _sum: {
        postViews: true,
      },
    });

    return views._sum.postViews || 0;
  }
}

export interface PostData {
  title: string;
  avatarURL?: string;
  summary?: string;
  content?: string;
  privacy?: Privacy;
}

export interface PostUpdateData {
  title?: string;
  avatarURL?: string;
  summary?: string;
  content?: string;
  privacy?: Privacy;
}

export class PostRepository {
  constructor(private readonly prismaPost: PQ.PrismaClient["post"]) {}

  async create(profileId: string, values: PostData) {
    const post = await this.prismaPost.create({
      data: {
        profileId,
        ...values,
      },
    });

    return new Post(post);
  }

  async update(postId: string, values: PostUpdateData) {
    const post = await this.prismaPost.update({
      where: {
        id: postId,
      },
      data: {
        ...values,
      },
    });

    return new Post(post);
  }

  async delete(postId: string) {
    return await this.prismaPost.delete({
      where: {
        id: postId,
      },
      select: { profileId: true, id: true },
    });
  }

  async find(postId: string) {
    const post = await this.prismaPost.findUnique({
      where: {
        id: postId,
      },
    });

    return post ? new Post(post) : null;
  }

  async findAll(filters: {
    profileId?: string;
    privacy?: Privacy;
    limit?: number;
    offset?: number;
  }) {
    console.log("Find all posts with filters: ", filters);

    const posts = await this.prismaPost.findMany({
      where: {
        profileId: filters.profileId,
        privacy: filters.privacy,
      },
      take: filters.limit,
      skip: filters.offset,
    });

    return posts.map((post) => new Post(post));
  }

  async findTrending(
    timeFrameInDays: number,
    filters: { limit?: number; offset?: number }
  ) {
    // Calculate the date for the beginning of the time frame
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeFrameInDays);

    // Query trending posts
    const group = await prisma.postStatistic.groupBy({
      by: ["postId"],
      _sum: {
        postViews: true,
      },
      where: {
        createdAt: {
          gte: startDate.toISOString(),
        },
      },
      orderBy: {
        _sum: {
          postViews: "desc",
        },
      },
    });

    const trendingPosts = await this.prismaPost.findMany({
      where: {
        id: {
          in: group.map((post) => post.postId),
        },
        privacy: "public",
      },
      take: filters.limit,
      skip: filters.offset,
    });

    console.log("Trending posts: ", trendingPosts);

    const sortedTrendingPosts: typeof trendingPosts = [];

    for (const { postId } of group) {
      // find post by id
      const sortedPost = trendingPosts.find((post) => post.id === postId);

      if (sortedPost) {
        sortedTrendingPosts.push(sortedPost);
      }
    }

    return sortedTrendingPosts.map((post) => new Post(post));
  }

  registerView = async (postId: string) => {
    await prisma.postStatistic.upsert({
      where: {
        postId_createdAt: {
          postId,
          createdAt: new Date().toISOString(),
        },
      },
      update: {
        postViews: {
          increment: 1,
        },
      },
      create: {
        postId,
        postViews: 1,
      },
    });

    return true;
  };

  async getOwnerUserId(postId: string) {
    const post = await this.prismaPost.findUnique({
      where: {
        id: postId,
      },
      select: {
        profile: {
          select: {
            userId: true,
          },
        },
      },
    });

    return post?.profile.userId;
  }
}

export const postRepository = new PostRepository(prisma.post);
