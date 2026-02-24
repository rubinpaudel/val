import prisma, {
  ProjectStatus,
  ResearchJobStatus,
  ResearchAgentType,
} from "@val/db";
import { NotFoundError } from "../../shared/errors/not-found.error";
import { ValidationError } from "../../shared/errors/validation.error";
import { ResearchInProgressError } from "../../shared/errors/research.error";
import { Logger } from "../../shared/logger";
import type {
  StartResearchInput,
  GetResearchStatusInput,
  CancelResearchJobInput,
  GetResearchResultsInput,
} from "./research.schema";

const logger = new Logger({ service: "research-service" });

export type QueueResearchJobFn = (data: {
  jobId: string;
  projectId: string;
  projectDescription: string;
}) => Promise<{ bullmqJobId: string }>;

export interface ResearchJobResponse {
  id: string;
  projectId: string;
  agentType: string;
  status: string;
  priority: number;
  progressPercent: number;
  progressMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  resultsSummary: unknown;
}

export interface ResearchStatusResponse {
  projectId: string;
  projectStatus: string;
  jobs: ResearchJobResponse[];
  overallProgress: number;
}

function toJobResponse(job: {
  id: string;
  projectId: string;
  agentType: string;
  status: string;
  priority: number;
  progressPercent: number;
  progressMessage: string | null;
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  resultsSummary: unknown;
}): ResearchJobResponse {
  return {
    id: job.id,
    projectId: job.projectId,
    agentType: job.agentType,
    status: job.status,
    priority: job.priority,
    progressPercent: job.progressPercent,
    progressMessage: job.progressMessage,
    queuedAt: job.queuedAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    failedAt: job.failedAt?.toISOString() ?? null,
    errorMessage: job.errorMessage,
    resultsSummary: job.resultsSummary,
  };
}

export const researchService = {
  async startResearch(
    userId: string,
    input: StartResearchInput,
    queueJob: QueueResearchJobFn,
  ): Promise<ResearchStatusResponse> {
    const { orchestratorJob, project } = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: input.projectId, userId, deletedAt: null },
        include: {
          researchJobs: {
            where: { status: { in: [ResearchJobStatus.QUEUED, ResearchJobStatus.RUNNING] } },
          },
        },
      });

      if (!project) {
        throw new NotFoundError("Project", input.projectId);
      }

      if (project.status !== ProjectStatus.answered) {
        throw new ValidationError(
          "Research can only be started for projects with all questions answered",
        );
      }

      if (project.researchJobs.length > 0) {
        throw new ResearchInProgressError(input.projectId);
      }

      let orchestratorJob;
      try {
        orchestratorJob = await tx.researchJob.create({
          data: {
            projectId: input.projectId,
            agentType: ResearchAgentType.ORCHESTRATOR,
            status: ResearchJobStatus.QUEUED,
          },
        });
      } catch (error: any) {
        // Catch race condition: unique constraint violation means another request
        // already created an active job for this project
        if (error.code === 'P2002' && error.meta?.target?.includes('projectId')) {
          throw new ResearchInProgressError(input.projectId);
        }
        throw error;
      }

      await tx.project.update({
        where: { id: input.projectId },
        data: { status: ProjectStatus.researching },
      });

      return { orchestratorJob, project };
    });

    try {
      await queueJob({
        jobId: orchestratorJob.id,
        projectId: input.projectId,
        projectDescription: project.rawBraindump,
      });

      logger.info("Research started", {
        projectId: input.projectId,
        orchestratorJobId: orchestratorJob.id,
      });
    } catch (error) {
      // Keep the FAILED record for debugging rather than deleting it.
      // Revert the project status so the user can retry.
      await prisma.researchJob.update({
        where: { id: orchestratorJob.id },
        data: {
          status: ResearchJobStatus.FAILED,
          failedAt: new Date(),
          errorMessage: "Failed to enqueue job",
        },
      });
      await prisma.project.update({
        where: { id: input.projectId },
        data: { status: ProjectStatus.answered },
      });
      throw error;
    }

    return this.getStatus(userId, { projectId: input.projectId });
  },

  async getStatus(
    userId: string,
    input: GetResearchStatusInput,
  ): Promise<ResearchStatusResponse> {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundError("Project", input.projectId);
    }

    const jobs = await prisma.researchJob.findMany({
      where: { projectId: input.projectId },
      orderBy: { queuedAt: "desc" },
    });

    const activeJobs = jobs.filter(
      (j) =>
        j.status === ResearchJobStatus.QUEUED ||
        j.status === ResearchJobStatus.RUNNING,
    );

    const overallProgress =
      activeJobs.length > 0
        ? Math.round(
            activeJobs.reduce((sum, j) => sum + j.progressPercent, 0) /
              activeJobs.length,
          )
        : jobs.length > 0
          ? 100
          : 0;

    return {
      projectId: input.projectId,
      projectStatus: project.status,
      jobs: jobs.map(toJobResponse),
      overallProgress,
    };
  },

  async cancel(
    userId: string,
    input: CancelResearchJobInput,
  ): Promise<ResearchJobResponse> {
    const job = await prisma.researchJob.findUnique({
      where: { id: input.jobId },
      include: { project: true },
    });

    if (!job || job.project.userId !== userId) {
      throw new NotFoundError("ResearchJob", input.jobId);
    }

    if (
      job.status !== ResearchJobStatus.QUEUED &&
      job.status !== ResearchJobStatus.RUNNING
    ) {
      throw new ValidationError(
        "Only queued or running jobs can be cancelled",
      );
    }

    const updated = await prisma.researchJob.update({
      where: { id: input.jobId },
      data: {
        status: ResearchJobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    const remainingActive = await prisma.researchJob.count({
      where: {
        projectId: job.projectId,
        status: { in: [ResearchJobStatus.QUEUED, ResearchJobStatus.RUNNING] },
      },
    });

    if (remainingActive === 0) {
      await prisma.project.update({
        where: { id: job.projectId },
        data: { status: ProjectStatus.answered },
      });
    }

    logger.info("Research job cancelled", { jobId: input.jobId });

    return toJobResponse(updated);
  },

  async getResults(userId: string, input: GetResearchResultsInput) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundError("Project", input.projectId);
    }

    const where: { projectId: string; resultType?: string } = {
      projectId: input.projectId,
    };
    if (input.resultType) {
      where.resultType = input.resultType;
    }

    const results = await prisma.researchResult.findMany({
      where,
      include: {
        citations: {
          include: { source: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return results.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      researchJobId: r.researchJobId,
      resultType: r.resultType,
      data: r.data,
      confidence: r.confidence,
      confidenceScore: r.confidenceScore ? Number(r.confidenceScore) : null,
      sourceCount: r.sourceCount,
      agentType: r.agentType,
      createdAt: r.createdAt.toISOString(),
      sources: r.citations.map((c) => ({
        id: c.source.id,
        title: c.source.title,
        url: c.source.url,
        sourceType: c.source.sourceType,
      })),
    }));
  },
};
