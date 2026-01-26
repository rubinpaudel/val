import type { PrismaClientType as PrismaClient, FrameworkStatus } from "@val/db";
import { Prisma } from "@val/db";
import type { ILogger } from "../../shared/logger";
import type {
  FrameworkDefinition,
  ValidationFramework,
  ValidationTask,
  ResearchReport,
  ResearchJob,
  TaskTemplate,
  ResearchConfig,
  ReportSchema,
} from "./validation.types";

export interface IValidationRepository {
  // Framework Definition
  findFrameworkDefinitionByType(type: string): Promise<FrameworkDefinition | null>;
  findAllActiveFrameworkDefinitions(): Promise<FrameworkDefinition[]>;

  // Validation Framework
  findFrameworkById(id: string): Promise<ValidationFramework | null>;
  findFrameworkByIdWithRelations(id: string): Promise<ValidationFramework | null>;
  findFrameworkByProjectAndType(
    projectId: string,
    definitionId: string
  ): Promise<ValidationFramework | null>;
  findFrameworksByProjectId(projectId: string): Promise<ValidationFramework[]>;
  createFramework(data: {
    projectId: string;
    definitionId: string;
  }): Promise<ValidationFramework>;
  updateFrameworkStatus(
    id: string,
    status: FrameworkStatus,
    additionalData?: { startedAt?: Date; completedAt?: Date }
  ): Promise<ValidationFramework>;

  // Validation Tasks
  findTaskById(id: string): Promise<ValidationTask | null>;
  findTasksByFrameworkId(frameworkId: string): Promise<ValidationTask[]>;
  createTasks(
    frameworkId: string,
    tasks: Omit<ValidationTask, "id" | "frameworkId" | "completedAt" | "createdAt">[]
  ): Promise<ValidationTask[]>;
  updateTaskAnswer(
    id: string,
    answer: string
  ): Promise<ValidationTask>;

  // Research Report
  findReportByFrameworkId(frameworkId: string): Promise<ResearchReport | null>;
  createReport(data: {
    frameworkId: string;
    summaryScore?: number;
    summaryVerdict?: string;
    summaryPoints?: unknown;
    sections?: unknown;
    sourcesCount?: number;
    rawData?: unknown;
  }): Promise<ResearchReport>;
  updateReport(
    id: string,
    data: Partial<Omit<ResearchReport, "id" | "frameworkId" | "createdAt" | "updatedAt">>
  ): Promise<ResearchReport>;

  // Research Job
  findJobByFrameworkId(frameworkId: string): Promise<ResearchJob | null>;
  createJob(data: {
    frameworkId: string;
    bullJobId?: string;
  }): Promise<ResearchJob>;
  updateJob(
    id: string,
    data: Partial<Omit<ResearchJob, "id" | "frameworkId" | "createdAt" | "updatedAt">>
  ): Promise<ResearchJob>;
  updateJobByFrameworkId(
    frameworkId: string,
    data: Partial<Omit<ResearchJob, "id" | "frameworkId" | "createdAt" | "updatedAt">>
  ): Promise<ResearchJob>;
}

export class ValidationRepository implements IValidationRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger
  ) {}

  // Helper to parse JSON fields from framework definition
  private parseFrameworkDefinition(def: {
    id: string;
    type: string;
    name: string;
    description: string;
    taskTemplates: unknown;
    researchConfig: unknown;
    reportSchema: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): FrameworkDefinition {
    return {
      ...def,
      taskTemplates: def.taskTemplates as TaskTemplate[],
      researchConfig: def.researchConfig as ResearchConfig,
      reportSchema: def.reportSchema as ReportSchema,
    };
  }

  // Framework Definition Methods
  async findFrameworkDefinitionByType(type: string): Promise<FrameworkDefinition | null> {
    this.logger.debug("Finding framework definition by type", { type });

    const definition = await this.prisma.frameworkDefinition.findUnique({
      where: { type },
    });

    if (!definition) return null;

    return this.parseFrameworkDefinition(definition);
  }

  async findAllActiveFrameworkDefinitions(): Promise<FrameworkDefinition[]> {
    this.logger.debug("Finding all active framework definitions");

    const definitions = await this.prisma.frameworkDefinition.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return definitions.map((def) => this.parseFrameworkDefinition(def));
  }

  // Validation Framework Methods
  async findFrameworkById(id: string): Promise<ValidationFramework | null> {
    this.logger.debug("Finding framework by id", { id });

    const framework = await this.prisma.validationFramework.findUnique({
      where: { id },
    });

    return framework as ValidationFramework | null;
  }

  async findFrameworkByIdWithRelations(id: string): Promise<ValidationFramework | null> {
    this.logger.debug("Finding framework by id with relations", { id });

    const framework = await this.prisma.validationFramework.findUnique({
      where: { id },
      include: {
        definition: true,
        tasks: {
          orderBy: { priority: "asc" },
        },
        report: true,
        job: true,
      },
    });

    if (!framework) return null;

    return {
      ...framework,
      definition: this.parseFrameworkDefinition(framework.definition),
    } as ValidationFramework;
  }

  async findFrameworkByProjectAndType(
    projectId: string,
    definitionId: string
  ): Promise<ValidationFramework | null> {
    this.logger.debug("Finding framework by project and definition", {
      projectId,
      definitionId,
    });

    const framework = await this.prisma.validationFramework.findUnique({
      where: {
        projectId_definitionId: {
          projectId,
          definitionId,
        },
      },
    });

    return framework as ValidationFramework | null;
  }

  async findFrameworksByProjectId(projectId: string): Promise<ValidationFramework[]> {
    this.logger.debug("Finding frameworks by project id", { projectId });

    const frameworks = await this.prisma.validationFramework.findMany({
      where: { projectId },
      include: {
        definition: true,
        tasks: {
          orderBy: { priority: "asc" },
        },
        report: true,
        job: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return frameworks.map((f) => ({
      ...f,
      definition: this.parseFrameworkDefinition(f.definition),
    })) as ValidationFramework[];
  }

  async createFramework(data: {
    projectId: string;
    definitionId: string;
  }): Promise<ValidationFramework> {
    this.logger.debug("Creating validation framework", data);

    const framework = await this.prisma.validationFramework.create({
      data: {
        projectId: data.projectId,
        definitionId: data.definitionId,
      },
    });

    this.logger.info("Validation framework created", { frameworkId: framework.id });

    return framework as ValidationFramework;
  }

  async updateFrameworkStatus(
    id: string,
    status: FrameworkStatus,
    additionalData?: { startedAt?: Date; completedAt?: Date }
  ): Promise<ValidationFramework> {
    this.logger.debug("Updating framework status", { id, status, additionalData });

    const framework = await this.prisma.validationFramework.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });

    return framework as ValidationFramework;
  }

  // Validation Task Methods
  async findTaskById(id: string): Promise<ValidationTask | null> {
    this.logger.debug("Finding task by id", { id });

    const task = await this.prisma.validationTask.findUnique({
      where: { id },
    });

    return task as ValidationTask | null;
  }

  async findTasksByFrameworkId(frameworkId: string): Promise<ValidationTask[]> {
    this.logger.debug("Finding tasks by framework id", { frameworkId });

    const tasks = await this.prisma.validationTask.findMany({
      where: { frameworkId },
      orderBy: { priority: "asc" },
    });

    return tasks as ValidationTask[];
  }

  async createTasks(
    frameworkId: string,
    tasks: Omit<ValidationTask, "id" | "frameworkId" | "completedAt" | "createdAt">[]
  ): Promise<ValidationTask[]> {
    this.logger.debug("Creating tasks for framework", {
      frameworkId,
      taskCount: tasks.length,
    });

    // Create tasks in a transaction
    const createdTasks = await this.prisma.$transaction(
      tasks.map((task) =>
        this.prisma.validationTask.create({
          data: {
            frameworkId,
            category: task.category,
            title: task.title,
            description: task.description,
            helpText: task.helpText,
            isRequired: task.isRequired,
            isCompleted: task.isCompleted,
            answer: task.answer,
            priority: task.priority,
          },
        })
      )
    );

    this.logger.info("Tasks created", {
      frameworkId,
      taskCount: createdTasks.length,
    });

    return createdTasks as ValidationTask[];
  }

  async updateTaskAnswer(id: string, answer: string): Promise<ValidationTask> {
    this.logger.debug("Updating task answer", { id });

    const task = await this.prisma.validationTask.update({
      where: { id },
      data: {
        answer,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    this.logger.info("Task completed", { taskId: id });

    return task as ValidationTask;
  }

  // Research Report Methods
  async findReportByFrameworkId(frameworkId: string): Promise<ResearchReport | null> {
    this.logger.debug("Finding report by framework id", { frameworkId });

    const report = await this.prisma.researchReport.findUnique({
      where: { frameworkId },
    });

    return report as ResearchReport | null;
  }

  async createReport(data: {
    frameworkId: string;
    summaryScore?: number;
    summaryVerdict?: string;
    summaryPoints?: Record<string, unknown> | unknown[] | null;
    sections?: Record<string, unknown> | null;
    sourcesCount?: number;
    rawData?: Record<string, unknown> | null;
  }): Promise<ResearchReport> {
    this.logger.debug("Creating research report", { frameworkId: data.frameworkId });

    const report = await this.prisma.researchReport.create({
      data: {
        frameworkId: data.frameworkId,
        summaryScore: data.summaryScore,
        summaryVerdict: data.summaryVerdict,
        summaryPoints: data.summaryPoints as Prisma.InputJsonValue ?? undefined,
        sections: data.sections as Prisma.InputJsonValue ?? undefined,
        sourcesCount: data.sourcesCount ?? 0,
        rawData: data.rawData as Prisma.InputJsonValue ?? undefined,
      },
    });

    this.logger.info("Research report created", { reportId: report.id });

    return report as ResearchReport;
  }

  async updateReport(
    id: string,
    data: {
      summaryScore?: number | null;
      summaryVerdict?: string | null;
      summaryPoints?: Record<string, unknown> | unknown[] | null;
      sections?: Record<string, unknown> | null;
      sourcesCount?: number;
      rawData?: Record<string, unknown> | null;
    }
  ): Promise<ResearchReport> {
    this.logger.debug("Updating research report", { id });

    const report = await this.prisma.researchReport.update({
      where: { id },
      data: {
        summaryScore: data.summaryScore,
        summaryVerdict: data.summaryVerdict,
        summaryPoints: data.summaryPoints as Prisma.InputJsonValue ?? undefined,
        sections: data.sections as Prisma.InputJsonValue ?? undefined,
        sourcesCount: data.sourcesCount,
        rawData: data.rawData as Prisma.InputJsonValue ?? undefined,
      },
    });

    return report as ResearchReport;
  }

  // Research Job Methods
  async findJobByFrameworkId(frameworkId: string): Promise<ResearchJob | null> {
    this.logger.debug("Finding job by framework id", { frameworkId });

    const job = await this.prisma.researchJob.findUnique({
      where: { frameworkId },
    });

    return job as ResearchJob | null;
  }

  async createJob(data: {
    frameworkId: string;
    bullJobId?: string;
  }): Promise<ResearchJob> {
    this.logger.debug("Creating research job", { frameworkId: data.frameworkId });

    const job = await this.prisma.researchJob.create({
      data: {
        frameworkId: data.frameworkId,
        bullJobId: data.bullJobId,
      },
    });

    this.logger.info("Research job created", { jobId: job.id });

    return job as ResearchJob;
  }

  async updateJob(
    id: string,
    data: Partial<Omit<ResearchJob, "id" | "frameworkId" | "createdAt" | "updatedAt">>
  ): Promise<ResearchJob> {
    this.logger.debug("Updating research job", { id, data });

    const job = await this.prisma.researchJob.update({
      where: { id },
      data,
    });

    return job as ResearchJob;
  }

  async updateJobByFrameworkId(
    frameworkId: string,
    data: Partial<Omit<ResearchJob, "id" | "frameworkId" | "createdAt" | "updatedAt">>
  ): Promise<ResearchJob> {
    this.logger.debug("Updating research job by framework id", { frameworkId, data });

    const job = await this.prisma.researchJob.update({
      where: { frameworkId },
      data,
    });

    return job as ResearchJob;
  }
}
