import * as PQ from "@prisma/client";
import { prisma } from "../prisma";
import { Profile } from "./Profile.repository";
import slugify from "slugify";
import { NotFoundError } from "../errors/general.errors";
import {
  ConnectionArguments,
  findManyCursorConnection,
} from "@devoxa/prisma-relay-cursor-connection";
import { Context, withContext } from "@snek-at/function";

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

  $query?: string;

  constructor(data: PQ.Post, query?: string) {
    for (const key in data) {
      this[key] = data[key];
    }

    this.$query = query;
  }

  /**
   * The text phrase that explains why the post is returned as a match for the given search query.
   * This field is used for providing context or explanation of the query match in search results.
   *
   * The summary is prioritized over the content.
   */
  matchingQuery() {
    // Find the first occurrence of the query in the summary or content and return a range of 100 characters around it
    const query = this.$query?.toLowerCase();

    if (!query) {
      return null;
    }

    const calculateMatchingQuery = (text: string) => {
      const index = text.toLowerCase().indexOf(query);

      if (index !== -1) {
        const start = Math.max(0, index - 50); // Start 50 characters before the query hit or at the beginning of the summary
        const end = Math.min(start + 100, text.length); // End 50 characters after the query hit or at the end of the summary
        const content = text.substring(start, end);

        return content;
      }

      return null;
    };

    if (this.title) {
      const result = calculateMatchingQuery(this.title);

      if (result) {
        return result;
      }
    }

    if (this.summary) {
      const result = calculateMatchingQuery(this.summary);

      if (result) {
        return result;
      }
    }

    if (this.content) {
      const content = JSON.parse(this.content);

      function searchForKey(
        obj: object,
        key: string,
        query: string
      ): string | null {
        if (typeof obj !== "object" || obj === null) {
          return null; // Not an object, cannot contain the key
        }

        for (const prop in obj) {
          if (obj.hasOwnProperty(prop)) {
            if (prop === key) {
              if (typeof obj[prop] === "string") {
                const result = calculateMatchingQuery(obj[prop]);

                if (result) {
                  return result;
                }
              }
            }

            if (typeof obj[prop] === "object" && obj[prop] !== null) {
              // Recursively search nested objects and arrays
              const result = searchForKey(obj[prop], key, query);
              if (result !== null) {
                return result; // Return the matched value from nested structure
              }
            }
          }
        }

        return null; // Key not found at any level
      }

      const contentIndex = searchForKey(content, "value", query);

      return contentIndex;
    }

    return null;
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

    // Temporary register a view for the post to make it appear in trending
    await this.registerView(post.id);

    // The post does not have the correct view count yet.
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

  find = (context: Context) => async (postId?: string, slug?: string) => {
    const post = await this.prismaPost.findUnique({
      where: {
        id: postId,
        slug,
      },
    });

    if (post) {
      if (post.privacy !== PQ.Privacy.PUBLIC) {
        const userId = context.req.headers["x-forwarded-user"] as string;

        if (userId !== post.profileId) {
          throw new NotFoundError("Post not found");
        }
      }
    } else {
      throw new NotFoundError("Post not found");
    }

    return new Post(post);
  };

  findAll =
    (context: Context) =>
    async (
      after: ConnectionArguments["after"],
      before: ConnectionArguments["before"],
      first: ConnectionArguments["first"],
      last: ConnectionArguments["last"],
      filters?: {
        userId?: string;
        privacy?: Privacy;
        language?: Language;
        query?: string;
        from?: Date;
        to?: Date;
      }
    ) => {
      let privacy: PQ.Privacy | undefined = PQ.Privacy.PUBLIC;

      if (
        context.req.headers["x-forwarded-user"] &&
        context.req.headers["x-forwarded-user"] === filters?.userId
      ) {
        privacy = filters?.privacy || undefined;
      }

      console.log("Privacy: ", privacy);

      return findManyCursorConnection(
        async (args: any) => {
          const qs = await this.prismaPost.findMany({
            where: {
              profileId: filters?.userId,
              privacy: privacy,
              language: filters?.language,
              OR: filters?.query
                ? [
                    {
                      title: { contains: filters.query, mode: "insensitive" },
                    },
                    {
                      summary: {
                        contains: filters.query,
                        mode: "insensitive",
                      },
                    },
                    {
                      content: {
                        contains: filters.query,
                        mode: "insensitive",
                      },
                    },
                  ]
                : undefined,
              createdAt:
                filters?.from || filters?.to
                  ? {
                      lte: filters?.to ? new Date(filters.to) : undefined,
                      gte: filters?.from ? new Date(filters.from) : undefined,
                    }
                  : undefined,
            },
            orderBy: {
              createdAt: "desc",
            },
            ...args,
          });

          return qs.map((post) => new Post(post, filters?.query));
        },
        () =>
          this.prismaPost.count({
            where: {
              profileId: filters?.userId,
              privacy: privacy,
              language: filters?.language,
              OR: filters?.query
                ? [
                    {
                      title: { contains: filters.query, mode: "insensitive" },
                    },
                    {
                      summary: {
                        contains: filters.query,
                        mode: "insensitive",
                      },
                    },
                    {
                      content: {
                        contains: filters.query,
                        mode: "insensitive",
                      },
                    },
                  ]
                : undefined,
              createdAt:
                filters?.from || filters?.to
                  ? {
                      lte: filters?.to ? new Date(filters.to) : undefined,
                      gte: filters?.from ? new Date(filters.from) : undefined,
                    }
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
    };

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
