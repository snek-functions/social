import { defineService, logger } from "@snek-at/function";

import { profile } from "./services/profile.service";
import { post } from "./services/post.service";

export default defineService(
  {
    Query: {
      profile: profile.find,
      allProfile: profile.findAll,
      post: post.find,
      allPost: post.findAll,
      allPostTrending: post.findTrending,
    },
    Mutation: {
      profileCreate: profile.create,
      profileUpdate: profile.update,
      profileDelete: profile.delete,
      profileFollow: profile.follow,
      profileUnfollow: profile.unfollow,
      postCreate: post.create,
      postUpdate: post.update,
      postDelete: post.delete,
      postStar: post.star,
      postUnstar: post.unstar,
    },
  },
  {
    configureApp(app) {
      logger.info("Configuring app");
      return app;
    },
  }
);
