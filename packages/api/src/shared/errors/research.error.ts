import { AppError } from "./base.error";

export class ValidationNotReadyError extends AppError {
  constructor(projectId: string, missingTasks: string[]) {
    super(
      `Cannot start research. Missing required tasks: ${missingTasks.join(", ")}`,
      "VALIDATION_NOT_READY",
      400,
      true,
      { projectId, missingTasks }
    );
  }
}

export class ResearchInProgressError extends AppError {
  constructor(projectId: string) {
    super(
      "Research is already in progress for this project",
      "RESEARCH_IN_PROGRESS",
      409,
      true,
      { projectId }
    );
  }
}

export class ResearchCompletedError extends AppError {
  constructor(projectId: string) {
    super(
      "Research has already been completed for this project",
      "RESEARCH_COMPLETED",
      409,
      true,
      { projectId }
    );
  }
}
