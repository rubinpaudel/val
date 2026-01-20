import { AppError } from "./base.error";

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "UNAUTHORIZED", 401, true);
  }
}
