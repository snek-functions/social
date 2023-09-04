import {
  ProfileData,
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

    await this.repository.activity.createProfileActivity(profile.id, "create");

    return profile;
  });

  update = withContext((context) => async (values: ProfileUpdateData) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const profileId = await this.repository.profile.profileIdByUserId(userId);

    const updatedProfile = await this.repository.profile.update(
      profileId,
      values
    );

    return updatedProfile;
  });

  delete = withContext((context) => async () => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const profileId = await this.repository.profile.profileIdByUserId(userId);

    await this.repository.profile.delete(profileId);

    return true;
  });

  find = withContext((context) => async (profileId?: string) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    if (!profileId) {
      profileId = await this.repository.profile.profileIdByUserId(userId);
    }

    const profile = await this.repository.profile.find(profileId);

    if (profile.userId !== userId) {
      await this.repository.profile.registerView(profileId);
    }

    return profile;
  });

  findAll = async () => {
    const profiles = await this.repository.profile.findAll();

    return profiles;
  };

  follow = withContext((context) => async (followProfileId: string) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const profileId = await this.repository.profile.profileIdByUserId(userId);

    const isAlreadyFollowed = await this.repository.follow.checkFollow(
      profileId,
      followProfileId
    );

    if (!isAlreadyFollowed) {
      const followed = await this.repository.follow.follow(
        profileId,
        followProfileId
      );

      await this.repository.activity.createProfileFollowActivity(
        profileId,
        followed.id,
        "follow"
      );

      return followed;
    }

    throw new ProfileAlreadyFollowedError(followProfileId);
  });

  unfollow = withContext((context) => async (followProfileId: string) => {
    const userId = context.req.headers["x-forwarded-user"] as string;

    const profileId = await this.repository.profile.profileIdByUserId(userId);

    const isAlreadyFollowed = await this.repository.follow.checkFollow(
      profileId,
      followProfileId
    );

    if (isAlreadyFollowed) {
      const followed = await this.repository.follow.unfollow(
        profileId,
        followProfileId
      );

      return followed;
    }

    throw new ProfileNotFollowedError(followProfileId);
  });
}

export const profile = new ProfileService();
