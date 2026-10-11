/** Thrown by services for invalid client input; api-handler answers it with HTTP 400. */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

/** Thrown when the viewer is logged in but not allowed to do this; api-handler answers it with HTTP 403. */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
