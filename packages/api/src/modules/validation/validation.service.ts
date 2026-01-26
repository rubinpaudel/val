import type { ILogger } from "../../shared/logger";
import { NotFoundError } from "../../shared/errors/not-found.error";
import type { IValidationRepository } from "./validation.repository";
import type {
  ValidationFramework,
  ValidationTask,
  ValidationFrameworkResponse,
  ValidationTaskResponse,
  ResearchReportResponse,
  ResearchJobResponse,
  ReadinessCheckResult,
  InitializeFrameworkInput,
  CompleteTaskInput,
  TaskTemplate,
} from "./validation.types";

export interface IValidationService {
  // Framework operations
  initializeFramework(input: InitializeFrameworkInput): Promise<ValidationFrameworkResponse>;
  getFramework(frameworkId: string): Promise<ValidationFrameworkResponse>;
  getFrameworksByProject(projectId: string): Promise<ValidationFrameworkResponse[]>;

  // Task operations
  completeTask(input: CompleteTaskInput): Promise<ValidationTaskResponse>;
  getTasksByFramework(frameworkId: string): Promise<ValidationTaskResponse[]>;

  // Research operations
  checkReadiness(frameworkId: string): Promise<ReadinessCheckResult>;
  startResearch(frameworkId: string): Promise<{ jobId: string; frameworkId: string }>;

  // Utilities
  getAvailableFrameworkTypes(): Promise<{ type: string; name: string; description: string }[]>;
}

export class ValidationService implements IValidationService {
  constructor(
    private readonly validationRepository: IValidationRepository,
    private readonly logger: ILogger
  ) {}

  // Convert framework to response format
  private toFrameworkResponse(
    framework: ValidationFramework
  ): ValidationFrameworkResponse {
    const tasks = framework.tasks || [];
    const completedTasks = tasks.filter((t) => t.isCompleted);
    const requiredTasks = tasks.filter((t) => t.isRequired);
    const completedRequiredTasks = requiredTasks.filter((t) => t.isCompleted);

    return {
      id: framework.id,
      projectId: framework.projectId,
      type: framework.definition?.type || "",
      name: framework.definition?.name || "",
      description: framework.definition?.description || "",
      status: framework.status,
      tasks: tasks.map((t) => this.toTaskResponse(t)),
      completedTasksCount: completedTasks.length,
      totalTasksCount: tasks.length,
      requiredTasksCount: requiredTasks.length,
      completedRequiredTasksCount: completedRequiredTasks.length,
      isReadyForResearch: completedRequiredTasks.length === requiredTasks.length,
      report: framework.report ? this.toReportResponse(framework.report) : null,
      job: framework.job ? this.toJobResponse(framework.job) : null,
      startedAt: framework.startedAt?.toISOString() || null,
      completedAt: framework.completedAt?.toISOString() || null,
      createdAt: framework.createdAt.toISOString(),
    };
  }

  private toTaskResponse(task: ValidationTask): ValidationTaskResponse {
    return {
      id: task.id,
      category: task.category,
      title: task.title,
      description: task.description,
      helpText: task.helpText,
      isRequired: task.isRequired,
      isCompleted: task.isCompleted,
      answer: task.answer,
      priority: task.priority,
      completedAt: task.completedAt?.toISOString() || null,
    };
  }

  private toReportResponse(report: {
    id: string;
    summaryScore: number | null;
    summaryVerdict: string | null;
    summaryPoints: unknown;
    sections: unknown;
    sourcesCount: number;
    createdAt: Date;
  }): ResearchReportResponse {
    return {
      id: report.id,
      summaryScore: report.summaryScore,
      summaryVerdict: report.summaryVerdict,
      summaryPoints: report.summaryPoints,
      sections: report.sections,
      sourcesCount: report.sourcesCount,
      createdAt: report.createdAt.toISOString(),
    };
  }

  private toJobResponse(job: {
    id: string;
    status: string;
    progress: number;
    currentStep: string | null;
    error: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
  }): ResearchJobResponse {
    return {
      id: job.id,
      status: job.status as ResearchJobResponse["status"],
      progress: job.progress,
      currentStep: job.currentStep,
      error: job.error,
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
    };
  }

  // Framework operations
  async initializeFramework(
    input: InitializeFrameworkInput
  ): Promise<ValidationFrameworkResponse> {
    this.logger.debug("Initializing framework", { ...input });

    // Find the framework definition
    const definition = await this.validationRepository.findFrameworkDefinitionByType(
      input.frameworkType
    );

    if (!definition) {
      throw new NotFoundError("FrameworkDefinition", input.frameworkType);
    }

    // Check if framework already exists for this project
    const existingFramework = await this.validationRepository.findFrameworkByProjectAndType(
      input.projectId,
      definition.id
    );

    if (existingFramework) {
      this.logger.info("Framework already exists, returning existing", {
        frameworkId: existingFramework.id,
      });

      const framework = await this.validationRepository.findFrameworkByIdWithRelations(
        existingFramework.id
      );
      return this.toFrameworkResponse(framework!);
    }

    // Create new framework
    const framework = await this.validationRepository.createFramework({
      projectId: input.projectId,
      definitionId: definition.id,
    });

    // Create tasks from the definition's task templates
    const taskTemplates = definition.taskTemplates as TaskTemplate[];
    const tasksToCreate = taskTemplates.map((template) => ({
      category: template.category,
      title: template.title,
      description: template.description,
      helpText: template.helpText || null,
      isRequired: template.isRequired,
      isCompleted: false,
      answer: null,
      priority: template.priority,
    }));

    await this.validationRepository.createTasks(framework.id, tasksToCreate);

    this.logger.info("Framework initialized with tasks", {
      frameworkId: framework.id,
      taskCount: tasksToCreate.length,
    });

    // Return the full framework with relations
    const fullFramework = await this.validationRepository.findFrameworkByIdWithRelations(
      framework.id
    );

    return this.toFrameworkResponse(fullFramework!);
  }

  async getFramework(frameworkId: string): Promise<ValidationFrameworkResponse> {
    this.logger.debug("Getting framework", { frameworkId });

    const framework = await this.validationRepository.findFrameworkByIdWithRelations(
      frameworkId
    );

    if (!framework) {
      throw new NotFoundError("ValidationFramework", frameworkId);
    }

    return this.toFrameworkResponse(framework);
  }

  async getFrameworksByProject(
    projectId: string
  ): Promise<ValidationFrameworkResponse[]> {
    this.logger.debug("Getting frameworks by project", { projectId });

    const frameworks = await this.validationRepository.findFrameworksByProjectId(
      projectId
    );

    return frameworks.map((f) => this.toFrameworkResponse(f));
  }

  // Task operations
  async completeTask(input: CompleteTaskInput): Promise<ValidationTaskResponse> {
    this.logger.debug("Completing task", { ...input });

    const task = await this.validationRepository.findTaskById(input.taskId);

    if (!task) {
      throw new NotFoundError("ValidationTask", input.taskId);
    }

    const updatedTask = await this.validationRepository.updateTaskAnswer(
      input.taskId,
      input.answer
    );

    // Check if all required tasks are now complete
    const tasks = await this.validationRepository.findTasksByFrameworkId(
      task.frameworkId
    );
    const requiredTasks = tasks.filter((t) => t.isRequired);
    const allRequiredComplete = requiredTasks.every((t) => t.isCompleted);

    if (allRequiredComplete) {
      // Update framework status to READY
      await this.validationRepository.updateFrameworkStatus(
        task.frameworkId,
        "READY"
      );
      this.logger.info("Framework is now ready for research", {
        frameworkId: task.frameworkId,
      });
    }

    return this.toTaskResponse(updatedTask);
  }

  async getTasksByFramework(frameworkId: string): Promise<ValidationTaskResponse[]> {
    this.logger.debug("Getting tasks by framework", { frameworkId });

    const tasks = await this.validationRepository.findTasksByFrameworkId(frameworkId);

    return tasks.map((t) => this.toTaskResponse(t));
  }

  // Research operations
  async checkReadiness(frameworkId: string): Promise<ReadinessCheckResult> {
    this.logger.debug("Checking readiness", { frameworkId });

    const framework = await this.validationRepository.findFrameworkByIdWithRelations(
      frameworkId
    );

    if (!framework) {
      throw new NotFoundError("ValidationFramework", frameworkId);
    }

    const tasks = framework.tasks || [];
    const requiredTasks = tasks.filter((t) => t.isRequired);
    const completedRequiredTasks = requiredTasks.filter((t) => t.isCompleted);
    const missingTasks = requiredTasks
      .filter((t) => !t.isCompleted)
      .map((t) => t.title);

    return {
      isReady: completedRequiredTasks.length === requiredTasks.length,
      completedRequiredTasks: completedRequiredTasks.length,
      totalRequiredTasks: requiredTasks.length,
      missingTasks,
    };
  }

  async startResearch(
    frameworkId: string
  ): Promise<{ jobId: string; frameworkId: string }> {
    this.logger.debug("Starting research", { frameworkId });

    const framework = await this.validationRepository.findFrameworkByIdWithRelations(
      frameworkId
    );

    if (!framework) {
      throw new NotFoundError("ValidationFramework", frameworkId);
    }

    // Check if research is already in progress
    if (framework.status === "IN_PROGRESS") {
      throw new Error("Research is already in progress for this framework");
    }

    // Check if research is already complete
    if (framework.status === "COMPLETED") {
      throw new Error("Research has already been completed for this framework");
    }

    // Check readiness
    const readiness = await this.checkReadiness(frameworkId);
    if (!readiness.isReady) {
      throw new Error(
        `Cannot start research. Missing required tasks: ${readiness.missingTasks.join(", ")}`
      );
    }

    // Create job record (BullMQ job ID will be set by the worker)
    const job = await this.validationRepository.createJob({
      frameworkId,
    });

    // Update framework status
    await this.validationRepository.updateFrameworkStatus(frameworkId, "IN_PROGRESS", {
      startedAt: new Date(),
    });

    this.logger.info("Research started", {
      frameworkId,
      jobId: job.id,
    });

    return {
      jobId: job.id,
      frameworkId,
    };
  }

  // Utilities
  async getAvailableFrameworkTypes(): Promise<
    { type: string; name: string; description: string }[]
  > {
    this.logger.debug("Getting available framework types");

    const definitions = await this.validationRepository.findAllActiveFrameworkDefinitions();

    return definitions.map((d) => ({
      type: d.type,
      name: d.name,
      description: d.description,
    }));
  }
}
