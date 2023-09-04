import * as PQ from "@prisma/client";

import { prisma } from "../prisma";

export class StarRepository {
  constructor(private readonly prismaProfile: PQ.PrismaClient["star"]) {}

  star = async (profileId: string, postId: string) => {
    const star = await this.prismaProfile.create({
      data: {
        profileId,
        postId,
      },
    });

    return star;
  };

  unstar = async (profileId: string, postId: string) => {
    const star = await this.prismaProfile.delete({
      where: {
        postId_profileId: {
          profileId,
          postId,
        },
      },
    });

    return star;
  };

  checkStar = async (profileId: string, postId: string) => {
    const star = await this.prismaProfile.findUnique({
      where: {
        postId_profileId: {
          profileId,
          postId,
        },
      },
    });

    return star;
  };
}

export const starRepository = new StarRepository(prisma.star);
