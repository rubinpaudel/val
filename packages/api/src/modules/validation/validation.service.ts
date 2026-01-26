import type { PrismaClientType as PrismaClient, FrameworkStatus } from "@val/db";
import type { ILogger } from "../../shared/logger";
import { NotFoundError } from "../../shared/errors/not-found.error";
import {
  ValidationNotReadyError,
  ResearchInProgressError,
  ResearchCompletedError,
} from "../../shared/errors/research.error";
import type {
  TaskTemplate,
  ValidationFrameworkResponse,
  ValidationTaskResponse,
} from "./validation.types";

export interface IValidationService {
  initializeFramework(input: { projectId: string; frameworkType: string }): Promise<ValidationFrameworkResponse>;
  getFramework(frameworkId: string): Promise<ValidationFrameworkResponse>;
  getFrameworksByProject(projectId: string): Promise<ValidationFrameworkResponse[]>;
  completeTask(input: { taskId: string; answer: string }): Promise<ValidationTaskResponse>;
  getTasksByFramework(frameworkId: string): Promise<ValidationTaskResponse[]>;
  startResearch(frameworkId: string): Promise<{ jobId: string; frameworkId: string }>;
  getAvailableFrameworkTypes(): Promise<{ type: string; name: string; description: string }[]>;
}

// Helper to parse JSON fields from framework definition
function parseDefinition(def: { taskTemplates: unknown; researchConfig: unknown; reportSchema: unknown }) {
  return {
    taskTemplates: def.taskTemplates as TaskTemplate[],
  };
}

// Convert task with date serialization
function toTaskResponse(task: {
  id: string;
  category: string;
  title: string;
  description: string;
  helpText: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  answer: string | null;
  priority: number;
  completedAt: Date | null;
}): ValidationTaskResponse {
  return {
    ...task,
    completedAt: task.completedAt?.toISOString() || null,
  };
}

export class ValidationService implements IValidationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger
  ) {}

  private async getFrameworkWithRelations(id: string) {
    return this.prisma.validationFramework.findUnique({
      where: { id },
      include: {
        definition: true,
        tasks: { orderBy: { priority: "asc" } },
        report: true,
        job: true,
      },
    });
  }

  private toFrameworkResponse(framework: NonNullable<Awaited<ReturnType<typeof this.getFrameworkWithRelations>>>): ValidationFrameworkResponse {
    const tasks = framework.tasks || [];
    const requiredTasks = tasks.filter((t) => t.isRequired);
    const completedRequiredTasks = requiredTasks.filter((t) => t.isCompleted);

    return {
      id: framework.id,
      projectId: framework.projectId,
      type: framework.definition.type,
      name: framework.definition.name,
      description: framework.definition.description,
      status: framework.status,
      tasks: tasks.map(toTaskResponse),
      completedTasksCount: tasks.filter((t) => t.isCompleted).length,
      totalTasksCount: tasks.length,
      requiredTasksCount: requiredTasks.length,
      completedRequiredTasksCount: completedRequiredTasks.length,
      isReadyForResearch: completedRequiredTasks.length === requiredTasks.length,
      report: framework.report ? {
        id: framework.report.id,
        summaryScore: framework.report.summaryScore,
        summaryVerdict: framework.report.summaryVerdict,
        summaryPoints: framework.report.summaryPoints,
        sections: framework.report.sections,
        sourcesCount: framework.report.sourcesCount,
        createdAt: framework.report.createdAt.toISOString(),
      } : null,
      job: framework.job ? {
        id: framework.job.id,
        status: framework.job.status,
        progress: framework.job.progress,
        currentStep: framework.job.currentStep,
        error: framework.job.error,
        startedAt: framework.job.startedAt?.toISOString() || null,
        completedAt: framework.job.completedAt?.toISOString() || null,
      } : null,
      startedAt: framework.startedAt?.toISOString() || null,
      completedAt: framework.completedAt?.toISOString() || null,
      createdAt: framework.createdAt.toISOString(),
    };
  }

  async initializeFramework(input: { projectId: string; frameworkType: string }): Promise<ValidationFrameworkResponse> {
    const definition = await this.prisma.frameworkDefinition.findUnique({
      where: { type: input.frameworkType },
    });

    if (!definition) {
      throw new NotFoundError("FrameworkDefinition", input.frameworkType);
    }

    // Check if framework already exists
    const existing = await this.prisma.validationFramework.findUnique({
      where: { projectId_definitionId: { projectId: input.projectId, definitionId: definition.id } },
    });

    if (existing) {
      const framework = await this.getFrameworkWithRelations(existing.id);
      return this.toFrameworkResponse(framework!);
    }

    // Create framework with tasks in transaction
    const framework = await this.prisma.$transaction(async (tx) => {
      const created = await tx.validationFramework.create({
        data: { projectId: input.projectId, definitionId: definition.id },
      });

      const { taskTemplates } = parseDefinition(definition);
      await tx.validationTask.createMany({
        data: taskTemplates.map((t) => ({
          frameworkId: created.id,
          category: t.category,
          title: t.title,
          description: t.description,
          helpText: t.helpText || null,
          isRequired: t.isRequired,
          priority: t.priority,
        })),
      });

      return created;
    });

    this.logger.info("Framework initialized", { frameworkId: framework.id });

    const full = await this.getFrameworkWithRelations(framework.id);
    return this.toFrameworkResponse(full!);
  }

  async getFramework(frameworkId: string): Promise<ValidationFrameworkResponse> {
    const framework = await this.getFrameworkWithRelations(frameworkId);
    if (!framework) throw new NotFoundError("ValidationFramework", frameworkId);
    return this.toFrameworkResponse(framework);
  }

  async getFrameworksByProject(projectId: string): Promise<ValidationFrameworkResponse[]> {
    const frameworks = await this.prisma.validationFramework.findMany({
      where: { projectId },
      include: {
        definition: true,
        tasks: { orderBy: { priority: "asc" } },
        report: true,
        job: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return frameworks.map((f) => this.toFrameworkResponse(f));
  }

  async completeTask(input: { taskId: string; answer: string }): Promise<ValidationTaskResponse> {
    const task = await this.prisma.validationTask.findUnique({ where: { id: input.taskId } });
    if (!task) throw new NotFoundError("ValidationTask", input.taskId);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.validationTask.update({
        where: { id: input.taskId },
        data: { answer: input.answer, isCompleted: true, completedAt: new Date() },
      });

      // Check if all required tasks complete
      const tasks = await tx.validationTask.findMany({ where: { frameworkId: task.frameworkId } });
      const allRequiredComplete = tasks.filter((t) => t.isRequired).every((t) => t.isCompleted);

      if (allRequiredComplete) {
        await tx.validationFramework.update({
          where: { id: task.frameworkId },
          data: { status: "READY" },
        });
        this.logger.info("Framework ready for research", { frameworkId: task.frameworkId });
      }

      return updated;
    });

    return toTaskResponse(result);
  }

  async getTasksByFramework(frameworkId: string): Promise<ValidationTaskResponse[]> {
    const tasks = await this.prisma.validationTask.findMany({
      where: { frameworkId },
      orderBy: { priority: "asc" },
    });
    return tasks.map(toTaskResponse);
  }

  async startResearch(frameworkId: string): Promise<{ jobId: string; frameworkId: string }> {
    const framework = await this.getFrameworkWithRelations(frameworkId);
    if (!framework) throw new NotFoundError("ValidationFramework", frameworkId);

    if (framework.status === "IN_PROGRESS") throw new ResearchInProgressError(frameworkId);
    if (framework.status === "COMPLETED") throw new ResearchCompletedError(frameworkId);

    // Check readiness inline
    const requiredTasks = framework.tasks.filter((t) => t.isRequired);
    const missingTasks = requiredTasks.filter((t) => !t.isCompleted).map((t) => t.title);
    if (missingTasks.length > 0) {
      throw new ValidationNotReadyError(frameworkId, missingTasks);
    }

    const job = await this.prisma.researchJob.create({ data: { frameworkId } });
    await this.prisma.validationFramework.update({
      where: { id: frameworkId },
      data: { status: "IN_PROGRESS" as FrameworkStatus, startedAt: new Date() },
    });

    this.logger.info("Research started", { frameworkId, jobId: job.id });
    return { jobId: job.id, frameworkId };
  }

  async getAvailableFrameworkTypes(): Promise<{ type: string; name: string; description: string }[]> {
    const definitions = await this.prisma.frameworkDefinition.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { type: true, name: true, description: true },
    });
    return definitions;
  }
}
