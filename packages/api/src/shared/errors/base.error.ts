export type ErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "CONFLICT"
  | "VALIDATION_NOT_READY"
  | "RESEARCH_IN_PROGRESS"
  | "RESEARCH_COMPLETED";

export interface ErrorDetails {
  [key: string]: unknown;
}

export abstract class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: ErrorDetails;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    isOperational: boolean = true,
    details?: ErrorDetails
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
