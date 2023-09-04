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

export class Post {
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

    const profileId = await this.repository.profile.profileIdByUserId(userId);

    const post = await this.repository.post.create(profileId, values);

    await this.repository.activity.createBlogActivity(
      profileId,
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
  });

  find = withContext((context) => async (postId: string) => {
    const post = await this.repository.post.find(postId);

    const userId = context.req.headers["x-forwarded-user"] as string;
    const profileId = await this.repository.profile.profileIdByUserId(userId);

    if (post && post.profileId !== profileId) {
      await this.repository.post.registerView(postId);
    }

    return post;
  });

  findAll = withContext(
    (context) =>
      async (filters?: {
        profileId?: string;
        privacy?: Privacy;
        limit?: number;
        offset?: number;
      }) => {
        const userId = context.req.headers["x-forwarded-user"] as string;

        filters = {
          ...filters,
        };

        try {
          const profileId = await this.repository.profile.profileIdByUserId(
            userId
          );

          if (filters.profileId && filters.profileId !== profileId) {
            // Set privacy to public if user is not the owner of the profile
            filters.privacy = "public";
          }
        } catch (e) {
          // Set privacy to public if user is not logged in
          filters.privacy = "public";
        }

        const posts = await this.repository.post.findAll(filters);

        return posts;
      }
  );

  findTrending = async (filters?: { limit?: number; offset?: number }) => {
    const posts = await this.repository.post.findTrending(30, filters || {});

    return posts;
  };

  star = withContext((context) => async (postId: string) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const profileId = await this.repository.profile.profileIdByUserId(userId);

    const isAlreadyStarred = await this.repository.star.checkStar(
      profileId,
      postId
    );

    if (!isAlreadyStarred) {
      const starred = await this.repository.star.star(profileId, postId);

      await this.repository.activity.createBlogStarActivity(
        profileId,
        postId,
        "star"
      );

      return starred;
    }

    throw new PostAlreadyStarredError(postId);
  });

  unstar = withContext((context) => async (postId: string) => {
    const userId = context.req.headers["x-forwarded-user"] as string;
    const profileId = await this.repository.profile.profileIdByUserId(userId);

    const isAlreadyStarred = await this.repository.star.checkStar(
      profileId,
      postId
    );

    if (isAlreadyStarred) {
      const starred = await this.repository.star.unstar(profileId, postId);

      await this.repository.activity.createBlogStarActivity(
        profileId,
        postId,
        "unstar"
      );

      return starred;
    }

    throw new PostNotStarredError(postId);
  });
}

export const post = new Post();
