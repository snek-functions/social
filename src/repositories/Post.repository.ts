import * as PQ from "@prisma/client";
import { prisma } from "../prisma";
import { Profile } from "./Profile.repository";
import slugify from "slugify";
import { NotFoundError } from "../errors/general.errors";
import {
  ConnectionArguments,
  findManyCursorConnection,
} from "@devoxa/prisma-relay-cursor-connection";

export type Privacy = PQ.$Enums.Privacy;
export type Language = PQ.$Enums.Language;

export class Post implements PQ.Post {
  id: string;
  slug: string;
  title: string;
  avatarURL: string | null;
  summary: string | null;
  content: string | null;
  profileId: string;
  createdAt: Date;
  updatedAt: Date;
  privacy: Privacy;
  language: Language;

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

  stars = async (
    after: ConnectionArguments["after"],
    before: ConnectionArguments["before"],
    first: ConnectionArguments["first"],
    last: ConnectionArguments["last"],
    filters?: { userId?: string }
  ) => {
    try {
      return findManyCursorConnection(
        async (args: any) => {
          const qs = await prisma.star.findMany({
            where: {
              postId: this.id,
              profileId: filters?.userId,
            },

            include: {
              profile: true,
            },
            ...(args as {}),
          });

          return qs.map((star) => {
            return {
              id: star.id,
              profile: () => new Profile(star.profile),
              createdAt: star.createdAt,
            };
          });
        },
        () =>
          prisma.star.count({
            where: {
              postId: this.id,
              profileId: filters?.userId,
            },
          }),
        {
          after,
          before,
          first,
          last,
        }
      );
    } catch (error) {
      throw new NotFoundError("Posts not found");
    }
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
  language?: Language;
}

export interface PostUpdateData {
  title?: string;
  language?: Language;
  avatarURL?: string;
  summary?: string;
  content?: string;
  privacy?: Privacy;
}

export class PostRepository {
  constructor(private readonly prismaPost: PQ.PrismaClient["post"]) {}

  async create(profileId: string, values: PostData) {
    let slug = slugify(values.title, {
      lower: true,
    });

    let i = 1;

    while (await this.prismaPost.findUnique({ where: { slug } })) {
      slug =
        slugify(values.title, {
          lower: true,
        }) +
        "-" +
        i++;
    }

    const post = await this.prismaPost.create({
      data: {
        slug,
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

  async find(postId?: string, slug?: string) {
    if (!postId && !slug) {
      throw new Error("Either postId or slug must be provided.");
    }

    const post = await this.prismaPost.findUnique({
      where: {
        id: postId,
        slug,
      },
    });

    return post ? new Post(post) : null;
  }

  async findAll(
    after: ConnectionArguments["after"],
    before: ConnectionArguments["before"],
    first: ConnectionArguments["first"],
    last: ConnectionArguments["last"],
    filters?: {
      userId?: string;
      privacy?: Privacy;
      language?: Language;
      query?: string;
    }
  ) {
    console.log("Find all posts with filters: ", filters);

    return findManyCursorConnection(
      async (args: any) => {
        const qs = await this.prismaPost.findMany({
          where: {
            profileId: filters?.userId,
            privacy: filters?.privacy,
            language: filters?.language,
            OR: filters?.query
              ? [
                  { title: { contains: filters.query, mode: "insensitive" } },
                  { summary: { contains: filters.query, mode: "insensitive" } },
                  { content: { contains: filters.query, mode: "insensitive" } },
                ]
              : undefined,
          },
          ...args,
        });

        return qs.map((post) => new Post(post));
      },
      () =>
        this.prismaPost.count({
          where: {
            profileId: filters?.userId,
            privacy: filters?.privacy,
            language: filters?.language,
            OR: filters?.query
              ? [
                  { title: { contains: filters.query, mode: "insensitive" } },
                  { summary: { contains: filters.query, mode: "insensitive" } },
                  { content: { contains: filters.query, mode: "insensitive" } },
                ]
              : undefined,
          },
        }),
      {
        after,
        before,
        first,
        last,
      }
    );
  }

  async findTrending(
    timeFrameInDays: number,
    filters: {
      userId?: string;
      language?: Language;
    },
    after: ConnectionArguments["after"],
    before: ConnectionArguments["before"],
    first: ConnectionArguments["first"],
    last: ConnectionArguments["last"]
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

    console.log("Group: ", group);

    return findManyCursorConnection(
      async (args: any) => {
        const qs = await this.prismaPost.findMany({
          where: {
            id: {
              in: group.map((post) => post.postId),
            },
            profileId: filters.userId,
            privacy: "PUBLIC",
            language: filters.language,
          },
          orderBy: {
            createdAt: "desc",
          },
          ...args,
        });

        const sortedTrendingPosts: typeof qs = [];

        for (const { postId } of group) {
          // find post by id
          const sortedPost = qs.find((post) => post.id === postId);

          if (sortedPost) {
            sortedTrendingPosts.push(sortedPost);
          }
        }

        console.log("Sorted trending posts: ", sortedTrendingPosts);

        return sortedTrendingPosts.map((post) => new Post(post));
      },
      () =>
        this.prismaPost.count({
          where: {
            id: {
              in: group.map((post) => post.postId),
            },
            profileId: filters.userId,
            privacy: "PUBLIC",
            language: filters.language,
          },
        }),
      {
        after,
        before,
        first,
        last,
      }
    );
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
            id: true,
          },
        },
      },
    });

    return post?.profile.id;
  }
}

export const postRepository = new PostRepository(prisma.post);
