/** Thrown by services for invalid client input; api-handler answers it with HTTP 400. */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}
