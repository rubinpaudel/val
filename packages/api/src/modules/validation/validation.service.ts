import prisma, { type FrameworkStatus } from "@val/db";
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

// Helper to parse JSON fields from framework definition
function parseDefinition(def: { taskTemplates: unknown }) {
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

async function getFrameworkWithRelations(id: string) {
  return prisma.validationFramework.findUnique({
    where: { id },
    include: {
      definition: true,
      tasks: { orderBy: { priority: "asc" } },
      report: true,
      job: true,
    },
  });
}

type FrameworkWithRelations = NonNullable<Awaited<ReturnType<typeof getFrameworkWithRelations>>>;

function toFrameworkResponse(framework: FrameworkWithRelations): ValidationFrameworkResponse {
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
    report: framework.report
      ? {
          id: framework.report.id,
          summaryScore: framework.report.summaryScore,
          summaryVerdict: framework.report.summaryVerdict,
          summaryPoints: framework.report.summaryPoints,
          sections: framework.report.sections,
          sourcesCount: framework.report.sourcesCount,
          createdAt: framework.report.createdAt.toISOString(),
        }
      : null,
    job: framework.job
      ? {
          id: framework.job.id,
          status: framework.job.status,
          progress: framework.job.progress,
          currentStep: framework.job.currentStep,
          error: framework.job.error,
          startedAt: framework.job.startedAt?.toISOString() || null,
          completedAt: framework.job.completedAt?.toISOString() || null,
        }
      : null,
    startedAt: framework.startedAt?.toISOString() || null,
    completedAt: framework.completedAt?.toISOString() || null,
    createdAt: framework.createdAt.toISOString(),
  };
}

export const validationService = {
  async initializeFramework(input: {
    projectId: string;
    frameworkType: string;
  }): Promise<ValidationFrameworkResponse> {
    const definition = await prisma.frameworkDefinition.findUnique({
      where: { type: input.frameworkType },
    });

    if (!definition) {
      throw new NotFoundError("FrameworkDefinition", input.frameworkType);
    }

    // Check if framework already exists
    const existing = await prisma.validationFramework.findUnique({
      where: {
        projectId_definitionId: { projectId: input.projectId, definitionId: definition.id },
      },
    });

    if (existing) {
      const framework = await getFrameworkWithRelations(existing.id);
      return toFrameworkResponse(framework!);
    }

    // Create framework with tasks in transaction
    const framework = await prisma.$transaction(async (tx) => {
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

    const full = await getFrameworkWithRelations(framework.id);
    return toFrameworkResponse(full!);
  },

  async getFramework(frameworkId: string): Promise<ValidationFrameworkResponse> {
    const framework = await getFrameworkWithRelations(frameworkId);
    if (!framework) throw new NotFoundError("ValidationFramework", frameworkId);
    return toFrameworkResponse(framework);
  },

  async getFrameworksByProject(projectId: string): Promise<ValidationFrameworkResponse[]> {
    const frameworks = await prisma.validationFramework.findMany({
      where: { projectId },
      include: {
        definition: true,
        tasks: { orderBy: { priority: "asc" } },
        report: true,
        job: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return frameworks.map(toFrameworkResponse);
  },

  async completeTask(input: { taskId: string; answer: string }): Promise<ValidationTaskResponse> {
    const task = await prisma.validationTask.findUnique({ where: { id: input.taskId } });
    if (!task) throw new NotFoundError("ValidationTask", input.taskId);

    const result = await prisma.$transaction(async (tx) => {
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
      }

      return updated;
    });

    return toTaskResponse(result);
  },

  async getTasksByFramework(frameworkId: string): Promise<ValidationTaskResponse[]> {
    const tasks = await prisma.validationTask.findMany({
      where: { frameworkId },
      orderBy: { priority: "asc" },
    });
    return tasks.map(toTaskResponse);
  },

  async startResearch(frameworkId: string): Promise<{
    jobId: string;
    frameworkId: string;
    frameworkType: string;
    projectId: string;
    projectDescription: string;
  }> {
    const framework = await prisma.validationFramework.findUnique({
      where: { id: frameworkId },
      include: {
        definition: true,
        tasks: { orderBy: { priority: "asc" } },
        project: true,
      },
    });
    if (!framework) throw new NotFoundError("ValidationFramework", frameworkId);

    if (framework.status === "IN_PROGRESS") throw new ResearchInProgressError(frameworkId);
    if (framework.status === "COMPLETED") throw new ResearchCompletedError(frameworkId);

    // Check readiness inline
    const requiredTasks = framework.tasks.filter((t) => t.isRequired);
    const missingTasks = requiredTasks.filter((t) => !t.isCompleted).map((t) => t.title);
    if (missingTasks.length > 0) {
      throw new ValidationNotReadyError(frameworkId, missingTasks);
    }

    const job = await prisma.researchJob.create({ data: { frameworkId } });
    await prisma.validationFramework.update({
      where: { id: frameworkId },
      data: { status: "IN_PROGRESS" as FrameworkStatus, startedAt: new Date() },
    });

    return {
      jobId: job.id,
      frameworkId,
      frameworkType: framework.definition.type,
      projectId: framework.projectId,
      projectDescription: framework.project.description,
    };
  },

  async getAvailableFrameworkTypes(): Promise<{ type: string; name: string; description: string }[]> {
    return prisma.frameworkDefinition.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { type: true, name: true, description: true },
    });
  },
};
