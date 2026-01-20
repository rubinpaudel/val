import { AppError, type ErrorDetails } from "./base.error";

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | ErrorDetails) {
    const details =
      typeof identifier === "string"
        ? { resource, id: identifier }
        : { resource, ...identifier };

    super(`${resource} not found`, "NOT_FOUND", 404, true, details);
  }
}
