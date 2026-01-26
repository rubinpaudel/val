import { AppError } from "./base.error";

export class ValidationNotReadyError extends AppError {
  constructor(frameworkId: string, missingTasks: string[]) {
    super(
      `Cannot start research. Missing required tasks: ${missingTasks.join(", ")}`,
      "VALIDATION_NOT_READY",
      400,
      true,
      { frameworkId, missingTasks }
    );
  }
}

export class ResearchInProgressError extends AppError {
  constructor(frameworkId: string) {
    super(
      "Research is already in progress for this framework",
      "RESEARCH_IN_PROGRESS",
      409,
      true,
      { frameworkId }
    );
  }
}

export class ResearchCompletedError extends AppError {
  constructor(frameworkId: string) {
    super(
      "Research has already been completed for this framework",
      "RESEARCH_COMPLETED",
      409,
      true,
      { frameworkId }
    );
  }
}
