import { AppError, type ErrorDetails } from "./base.error";

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, "VALIDATION_ERROR", 400, true, details);
  }
}
