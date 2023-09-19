import {
  ProfileRepository,
  ProfileUpdateData,
  profileRepository,
} from "../repositories/Profile.repository";
import {
  ProfileAlreadyFollowedError,
  ProfileNotFollowedError,
} from "../errors/profile.errors";

import {
  FollowRepository,
  followRepository,
} from "../repositories/Follow.repository";
import {
  ActivityRepository,
  activityRepository,
} from "../repositories/Activity.repository";
import { withContext } from "@snek-at/function";
import { ConnectionArguments } from "@devoxa/prisma-relay-cursor-connection";

class ProfileService {
  private repository: {
    profile: ProfileRepository;
    follow: FollowRepository;
    activity: ActivityRepository;
  };

  constructor() {
    this.repository = {
      profile: profileRepository,
      follow: followRepository,
      activity: activityRepository,
    };
  }

  create = withContext((context) => async () => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const profile = await this.repository.profile.create(userId);

    await this.repository.activity.createProfileActivity(userId, "create");

    return profile;
  });

  update = withContext((context) => async (values: ProfileUpdateData) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const updatedProfile = await this.repository.profile.update(userId, values);

    return updatedProfile;
  });

  delete = withContext((context) => async () => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    await this.repository.profile.delete(userId);

    return true;
  });

  find = withContext((context) => async (userId: string) => {
    const forwardedUserId = context.req.headers["x-forwarded-user"] as string;

    const profile = await this.repository.profile.find(userId);

    if (profile.id !== forwardedUserId) {
      await this.repository.profile.registerView(userId);
    }

    return profile;
  });

  findAll = (
    after: ConnectionArguments["after"],
    before: ConnectionArguments["before"],
    first: ConnectionArguments["first"],
    last: ConnectionArguments["last"]
  ) => {
    return this.repository.profile.findAll(after, before, first, last);
  };

  follow = withContext((context) => async (userId: string) => {
    const forwardedUserId = context.req.headers["x-forwarded-user"] as string;

    const isAlreadyFollowed = await this.repository.follow.checkFollow(
      forwardedUserId,
      userId
    );

    if (!isAlreadyFollowed) {
      const followed = await this.repository.follow.follow(
        forwardedUserId,
        userId
      );

      await this.repository.activity.createProfileFollowActivity(
        forwardedUserId,
        followed.id,
        "follow"
      );

      return followed;
    }

    throw new ProfileAlreadyFollowedError(userId);
  });

  unfollow = withContext((context) => async (userId: string) => {
    const forwardedUserId = context.req.headers["x-forwarded-user"] as string;

    const isAlreadyFollowed = await this.repository.follow.checkFollow(
      forwardedUserId,
      userId
    );

    if (isAlreadyFollowed) {
      const followed = await this.repository.follow.unfollow(
        forwardedUserId,
        userId
      );

      return followed;
    }

    throw new ProfileNotFollowedError(userId);
  });
}

export const profile = new ProfileService();
