import { AppError, type ErrorDetails } from "./base.error";

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied", details?: ErrorDetails) {
    super(message, "FORBIDDEN", 403, true, details);
  }
}
