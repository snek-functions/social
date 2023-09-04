// errors/user.errors.ts
import { ServiceError } from "@snek-at/function";

export class ProfileAlreadyFollowedError extends ServiceError {
  constructor(id: string) {
    const message = `Profile with id ${id} is already followed`;

    super(message, {
      statusCode: 400,
      code: "PROFILE_ALREADY_FOLLOWED",
      message,
    });
  }
}

export class ProfileNotFollowedError extends ServiceError {
  constructor(id: string) {
    const message = `Profile with id ${id} is not followed`;

    super(message, {
      statusCode: 400,
      code: "PROFILE_NOT_FOLLOWED",
      message,
    });
  }
}
