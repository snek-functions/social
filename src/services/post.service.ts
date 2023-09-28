import { withContext } from "@snek-at/function";
import {
  PostAlreadyStarredError,
  PostNotStarredError,
} from "../errors/post.errors";
import {
  ActivityRepository,
  activityRepository,
} from "../repositories/Activity.repository";
import {
  Language,
  PostData,
  PostRepository,
  PostUpdateData,
  Privacy,
  postRepository,
} from "../repositories/Post.repository";
import {
  StarRepository,
  starRepository,
} from "../repositories/Star.repository";
import {
  ProfileRepository,
  profileRepository,
} from "../repositories/Profile.repository";
import { AuthenticationError, NotFoundError } from "../errors/general.errors";
import { ConnectionArguments } from "@devoxa/prisma-relay-cursor-connection";

export class PostService {
  private repository: {
    star: StarRepository;
    profile: ProfileRepository;
    post: PostRepository;
    activity: ActivityRepository;
  };

  constructor() {
    this.repository = {
      star: starRepository,
      profile: profileRepository,
      post: postRepository,
      activity: activityRepository,
    };
  }

  create = withContext((context) => async (values: PostData) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const post = await this.repository.post.create(userId, values);

    await this.repository.activity.createBlogActivity(
      userId,
      post.id,
      "create"
    );

    return post;
  });

  update = withContext(
    (context) => async (postId: string, values: PostUpdateData) => {
      const userId = context.req.headers["x-forwarded-user"] as string;

      if (userId !== (await this.repository.post.getOwnerUserId(postId))) {
        throw new Error("You are not the owner of this post.");
      }

      const post = await this.repository.post.update(postId, values);

      return post;
    }
  );

  delete = withContext((context) => async (postId: string) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    if (userId !== (await this.repository.post.getOwnerUserId(postId))) {
      throw new Error("You are not the owner of this post.");
    }

    await this.repository.post.delete(postId);

    return true;
  });

  find = withContext((context) => async (postId?: string, slug?: string) => {
    const post = await this.repository.post.find(postId, slug);

    const userId = context.req.headers["x-forwarded-user"] as string;

    if (post && post.profileId !== userId) {
      await this.repository.post.registerView(post.id);

      // Return only public posts if user is not the owner of the profile
      if (post.privacy !== "PUBLIC") {
        throw new NotFoundError("Post not found");
      }
    }

    return post;
  });

  findAll = withContext(
    (context) =>
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
          from?: string;
          to?: string;
        }
      ) => {
        // Default privacy is public
        filters = {
          privacy: "PUBLIC",
          ...filters,
        };

        const userId = context.req.headers["x-forwarded-user"] as
          | string
          | undefined;

        if (!userId && filters?.privacy !== "PUBLIC") {
          throw new AuthenticationError(
            "You need to be logged in to view non-public posts"
          );
        }

        filters = {
          ...filters,
        };

        try {
          if (!userId || (filters.userId && filters.userId !== userId)) {
            // Set privacy to public if user is not the owner of the profile or not logged in
            filters.privacy = "PUBLIC";
          }
        } catch (e) {
          // Set privacy to public if user is not logged in
          filters.privacy = "PUBLIC";
        }

        const posts = await this.repository.post.findAll(
          after,
          before,
          first,
          last,
          filters
        );

        return posts;
      }
  );

  findTrending = async (
    after: ConnectionArguments["after"],
    before: ConnectionArguments["before"],
    first: ConnectionArguments["first"],
    last: ConnectionArguments["last"],
    filters?: {
      userId?: string;
      language?: Language;
    }
  ) => {
    const posts = await this.repository.post.findTrending(
      30,
      filters || {},
      after,
      before,
      first,
      last
    );

    return posts;
  };

  star = withContext((context) => async (postId: string) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const isAlreadyStarred = await this.repository.star.checkStar(
      userId,
      postId
    );

    if (!isAlreadyStarred) {
      const starred = await this.repository.star.star(userId, postId);

      await this.repository.activity.createBlogStarActivity(
        userId,
        postId,
        "star"
      );

      return starred;
    }

    throw new PostAlreadyStarredError(postId);
  });

  unstar = withContext((context) => async (postId: string) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const isAlreadyStarred = await this.repository.star.checkStar(
      userId,
      postId
    );

    if (isAlreadyStarred) {
      const starred = await this.repository.star.unstar(userId, postId);

      await this.repository.activity.createBlogStarActivity(
        userId,
        postId,
        "unstar"
      );

      return starred;
    }

    throw new PostNotStarredError(postId);
  });
}

export const post = new PostService();
