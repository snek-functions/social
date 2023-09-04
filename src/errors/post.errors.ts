// errors/user.errors.ts
import { ServiceError } from "@snek-at/function";

export class PostAlreadyStarredError extends ServiceError {
  constructor(id: string) {
    const message = `Post with id ${id} is already starred`;

    super(message, {
      statusCode: 400,
      code: "POST_ALREADY_STARRED",
      message,
    });
  }
}

export class PostNotStarredError extends ServiceError {
  constructor(id: string) {
    const message = `Post with id ${id} is not starred`;

    super(message, {
      statusCode: 400,
      code: "POST_NOT_STARRED",
      message,
    });
  }
}
