import { ServiceError } from "@snek-at/function";

export class InvalidInputError extends ServiceError {
  constructor(message: string) {
    super(message, {
      code: "INVALID_INPUT",
      statusCode: 400,
      message,
    });
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string) {
    super(message, {
      code: "NOT_FOUND",
      statusCode: 404,
      message,
    });
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message: string) {
    super(message, {
      code: "AUTHENTICATION_ERROR",
      statusCode: 401,
      message,
    });
  }
}
