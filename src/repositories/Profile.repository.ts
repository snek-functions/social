import * as PQ from "@prisma/client";
import { prisma } from "../prisma";
import { Post } from "./Post.repository";
import { NotFoundError } from "../errors/general.errors";
import {
  ConnectionArguments,
  findManyCursorConnection,
} from "@devoxa/prisma-relay-cursor-connection";
import { withContext } from "@snek-at/function";

export class Profile implements PQ.Profile {
  id: string;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  language: PQ.$Enums.Language;

  constructor(data: PQ.Profile) {
    for (const key in data) {
      this[key] = data[key];
    }
  }

  posts = withContext(
    (context) =>
      async (
        after: ConnectionArguments["after"],
        before: ConnectionArguments["before"],
        first: ConnectionArguments["first"],
        last: ConnectionArguments["last"]
      ) => {
        const privacy =
          context.req.headers["x-forwarded-user"] === this.id
            ? undefined
            : PQ.$Enums.Privacy.PUBLIC;

        return findManyCursorConnection(
          async (args: any) => {
            const qs = await prisma.post.findMany({
              where: {
                profileId: this.id,
                privacy,
              },
              orderBy: {
                createdAt: "desc",
              },
              ...(args as {}),
            });

            return qs.map((post) => {
              return new Post(post);
            });
          },
          () =>
            prisma.post.count({
              where: {
                profileId: this.id,
                privacy,
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
  );

  starredPosts = withContext(
    (context) =>
      async (
        after: ConnectionArguments["after"],
        before: ConnectionArguments["before"],
        first: ConnectionArguments["first"],
        last: ConnectionArguments["last"],
        filters?: {
          query?: string;
          from?: Date;
          to?: Date;
          language?: PQ.$Enums.Language;
          orderBy?: "MOST_RECENT" | "MOST_STARRED";
        }
      ) => {
        const privacy =
          context.req.headers["x-forwarded-user"] === this.id
            ? undefined
            : PQ.$Enums.Privacy.PUBLIC;

        return findManyCursorConnection(
          async (args: any) => {
            const qs = await prisma.star.findMany({
              where: {
                profileId: this.id,
                createdAt: {
                  gte: filters?.from,
                  lte: filters?.to,
                },
                post: {
                  title: {
                    contains: filters?.query,
                    mode: "insensitive",
                  },
                  language: filters?.language,
                  privacy,
                },
              },
              include: {
                post: true,
              },
              orderBy: {
                createdAt:
                  filters?.orderBy === "MOST_RECENT" ? "desc" : undefined,
                ...(filters?.orderBy === "MOST_STARRED" && {
                  post: {
                    stars: {
                      _count: "desc",
                    },
                  },
                }),
              },
              ...(args as {}),
            });

            return qs.map((star) => {
              return {
                id: star.id,
                post: () => new Post(star.post),
                createdAt: star.createdAt,
              };
            });
          },
          () =>
            prisma.star.count({
              where: {
                profileId: this.id,
                createdAt: {
                  gte: filters?.from,
                  lte: filters?.to,
                },
                post: {
                  title: {
                    contains: filters?.query,
                    mode: "insensitive",
                  },
                  language: filters?.language,
                  privacy,
                },
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
  );

  stars = withContext(
    (context) =>
      (
        after: ConnectionArguments["after"],
        before: ConnectionArguments["before"],
        first: ConnectionArguments["first"],
        last: ConnectionArguments["last"],
        filters?: {
          query?: string;
          from?: Date;
          to?: Date;
          language?: PQ.$Enums.Language;
          orderBy?: "MOST_RECENT" | "MOST_STARRED";
        }
      ) => {
        try {
          const privacy =
            context.req.headers["x-forwarded-user"] === this.id
              ? undefined
              : PQ.$Enums.Privacy.PUBLIC;

          return findManyCursorConnection(
            async (args: any) => {
              const qs = await prisma.star.findMany({
                where: {
                  profileId: this.id,
                  createdAt: {
                    gte: filters?.from,
                    lte: filters?.to,
                  },

                  post: {
                    title: {
                      contains: filters?.query,
                      mode: "insensitive",
                    },
                    language: filters?.language,
                    privacy,
                  },
                },
                orderBy: {
                  createdAt:
                    filters?.orderBy === "MOST_RECENT" ? "desc" : undefined,
                  ...(filters?.orderBy === "MOST_STARRED" && {
                    post: {
                      stars: {
                        _count: "desc",
                      },
                    },
                  }),
                },

                include: {
                  post: true,
                },
                ...(args as {}),
              });

              return qs.map((star) => {
                return {
                  id: star.id,
                  post: () => new Post(star.post),
                  createdAt: star.createdAt,
                };
              });
            },
            () =>
              prisma.star.count({
                where: {
                  profileId: this.id,
                  createdAt: {
                    gte: filters?.from,
                    lte: filters?.to,
                  },

                  post: {
                    title: {
                      contains: filters?.query,
                      mode: "insensitive",
                    },
                    language: filters?.language,
                    privacy,
                  },
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
          throw new NotFoundError("Stars not found");
        }
      }
  );

  async followers(
    after: ConnectionArguments["after"],
    before: ConnectionArguments["before"],
    first: ConnectionArguments["first"],
    last: ConnectionArguments["last"],
    filters?: { userId?: string; from?: Date; to?: Date }
  ) {
    try {
      return findManyCursorConnection(
        async (args: any) => {
          const qs = await prisma.follow.findMany({
            where: {
              followedId: this.id,
              followerId: filters?.userId,
              createdAt: {
                gte: filters?.from,
                lte: filters?.to,
              },
            },
            include: {
              follower: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            ...(args as {}),
          });

          return qs.map((follow) => {
            return {
              id: follow.id,
              follower: () => new Profile(follow.follower),
              createdAt: follow.createdAt,
            };
          });
        },
        () =>
          prisma.follow.count({
            where: {
              followedId: this.id,
              followerId: filters?.userId,
              createdAt: {
                gte: filters?.from,
                lte: filters?.to,
              },
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
      throw new NotFoundError("Followers not found");
    }
  }

  async following(
    after: ConnectionArguments["after"],
    before: ConnectionArguments["before"],
    first: ConnectionArguments["first"],
    last: ConnectionArguments["last"],
    filters?: { userId?: string; from?: Date; to?: Date }
  ) {
    try {
      return findManyCursorConnection(
        async (args: any) => {
          const qs = await prisma.follow.findMany({
            where: {
              followerId: this.id,
              followedId: filters?.userId,
              createdAt: {
                gte: filters?.from,
                lte: filters?.to,
              },
            },
            include: {
              followed: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            ...(args as {}),
          });

          return qs.map((follow) => {
            return {
              id: follow.id,
              followed: () => new Profile(follow.followed),
              createdAt: follow.createdAt,
            };
          });
        },
        () =>
          prisma.follow.count({
            where: {
              followerId: this.id,
              followedId: filters?.userId,
              createdAt: {
                gte: filters?.from,
                lte: filters?.to,
              },
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
      throw new NotFoundError("Following not found");
    }
  }

  activity = withContext(
    (context) =>
      async (
        after: ConnectionArguments["after"],
        before: ConnectionArguments["before"],
        first: ConnectionArguments["first"],
        last: ConnectionArguments["last"]
      ) => {
        const privacy =
          context.req.headers["x-forwarded-user"] === this.id
            ? undefined
            : PQ.$Enums.Privacy.PUBLIC;

        return findManyCursorConnection(
          async (args: any) => {
            const qs = await prisma.activity.findMany({
              where: {
                profileId: this.id,
              },
              include: {
                post: {
                  where: {
                    privacy,
                  },
                },
                follow: {
                  include: {
                    followed: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              distinct: ["type", "postId", "followId", "starId"],

              ...(args as {}),
            });

            return qs.map((activty) => {
              return {
                id: activty.id,
                createdAt: activty.createdAt.toISOString(),
                type: activty.type,
                post: activty.post ? new Post(activty.post) : null,
                follow: activty.follow
                  ? {
                      createdAt: activty.follow.createdAt,
                      followed: new Profile(activty.follow.followed),
                    }
                  : undefined,
              };
            });
          },
          async () => {
            const res =
              prisma.$queryRaw`SELECT COUNT(DISTINCT concat("type", "postId", "followId", "starId")) as "count" FROM "Activity" WHERE "profileId"::text = ${this.id}` as Promise<
                { count: BigInt }[]
              >;

            const count = (await res)[0].count;

            // Convert BigInt to Number
            return Number(count);
          },
          {
            after,
            before,
            first,
            last,
          }
        );
      }
  );

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

export interface ProfileUpdateData {
  language?: PQ.$Enums.Language;
  bio?: string | null;
}

export class ProfileRepository {
  constructor(private readonly prismaProfile: PQ.PrismaClient["profile"]) {}

  async create(userId: string) {
    const profile = await this.prismaProfile.create({
      data: {
        id: userId,
      },
    });

    return new Profile(profile);
  }

  async update(userId: string, values: ProfileUpdateData) {
    const profile = await this.prismaProfile.update({
      where: {
        id: userId,
      },
      data: {
        ...values,
      },
    });

    return new Profile(profile);
  }

  async delete(userId: string) {
    return await this.prismaProfile.delete({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });
  }

  async find(userId: string) {
    const profile = await this.prismaProfile.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });

    return new Profile(profile);
  }

  findAll = (
    after: ConnectionArguments["after"],
    before: ConnectionArguments["before"],
    first: ConnectionArguments["first"],
    last: ConnectionArguments["last"]
  ) => {
    return findManyCursorConnection(
      async (args: any) => {
        const qs = await this.prismaProfile.findMany({
          ...args,
        });

        return qs
          ? qs.map((result: PQ.Profile) => {
              return new Profile(result);
            })
          : [];
      },
      () => this.prismaProfile.count(),
      {
        after,
        before,
        first,
        last,
      }
    );
  };

  async registerView(userId: string) {
    await prisma.profileStatistic.upsert({
      where: {
        profileId_createdAt: {
          profileId: userId,
          createdAt: new Date().toISOString(),
        },
      },
      update: {
        profileViews: {
          increment: 1,
        },
      },
      create: {
        profileId: userId,
        profileViews: 1,
      },
    });

    return true;
  }
}

export const profileRepository = new ProfileRepository(prisma.profile);
