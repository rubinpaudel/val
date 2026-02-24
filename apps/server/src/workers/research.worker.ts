import { Worker, Job } from "bullmq";
import prisma, { ResearchJobStatus, ProjectStatus } from "@val/db";
import {
  runCompetitorDiscovery,
  runCompetitorIntel,
  CompetitorJobConfigSchema,
  type ProjectContext,
  type CompetitorJobConfig,
} from "@val/agents";
import { getPostHogClient } from "@val/api/services/posthog";
import { getRedisConnectionOptions } from "../lib/redis";
import { RESEARCH_QUEUE, addResearchJob, type ResearchJobData } from "../lib/queue";
import { Logger } from "@val/api/shared";

const logger = new Logger(
  { service: "research-worker" },
  process.env.NODE_ENV === "production" ? "info" : "debug"
);

async function processResearchJob(job: Job<ResearchJobData>): Promise<void> {
  const { jobId, projectId } = job.data;

  logger.info("Research job received", {
    bullmqJobId: job.id,
    researchJobId: jobId,
    projectId,
  });

  // Mark job as RUNNING in the database
  await prisma.researchJob.update({
    where: { id: jobId },
    data: {
      status: ResearchJobStatus.RUNNING,
      startedAt: new Date(),
      progressPercent: 0,
      progressMessage: "Starting research...",
    },
  });

  const { agentType } = job.data;
  const posthogClient = getPostHogClient();

  switch (agentType) {
    case "ORCHESTRATOR": {
      // Fetch project with elements and Q&A
      const project = await prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        include: {
          elements: { where: { isCurrent: true } },
          questions: {
            include: {
              answers: { where: { isCurrent: true }, take: 1 },
            },
            orderBy: { displayOrder: "asc" },
          },
        },
      });

      const context: ProjectContext = {
        projectId,
        rawBraindump: project.rawBraindump,
        title: project.title,
        elements: project.elements.map((el) => ({
          elementType: el.elementType,
          statedValue: el.statedValue,
        })),
        questionsAndAnswers: project.questions.map((q) => ({
          questionText: q.questionText,
          answerText: q.answers[0]?.answerText ?? null,
        })),
      };

      // Wrapper: direct pass-through to queue's addResearchJob (terminology now consistent)
      const queueSubJob = async (data: {
        jobId: string;
        agentType: string;
        projectId: string;
        projectDescription: string;
        maxDuration?: number;
      }) => {
        return await addResearchJob(data);
      };

      await runCompetitorDiscovery(context, jobId, queueSubJob, posthogClient);
      break;
    }

    case "COMPETITOR_INTEL": {
      const researchJob = await prisma.researchJob.findUniqueOrThrow({
        where: { id: jobId },
      });

      // Validate config with Zod schema for type safety
      let config: CompetitorJobConfig;
      try {
        config = CompetitorJobConfigSchema.parse(researchJob.config);
      } catch (validationError) {
        logger.error("Invalid COMPETITOR_INTEL config", validationError instanceof Error ? validationError : undefined, {
          jobId,
          config: researchJob.config,
        });
        throw new Error("Invalid job configuration");
      }

      await runCompetitorIntel(jobId, config, posthogClient);
      break;
    }

    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

// Worker singleton
let worker: Worker<ResearchJobData> | null = null;

export function startResearchWorker(): Worker<ResearchJobData> {
  if (worker) return worker;

  worker = new Worker<ResearchJobData>(RESEARCH_QUEUE, processResearchJob, {
    connection: getRedisConnectionOptions(),
    concurrency: 2,
  });

  worker.on("completed", async (job) => {
    const { jobId, projectId } = job.data;
    logger.info("Job completed", { bullmqJobId: job.id, researchJobId: jobId });

    try {
      // Check if the job was cancelled while it was running
      const currentJob = await prisma.researchJob.findUnique({
        where: { id: jobId },
        select: { status: true },
      });

      if (currentJob?.status === ResearchJobStatus.CANCELLED) {
        logger.info("Skipping completion update for cancelled job", {
          researchJobId: jobId,
        });
        return;
      }

      await prisma.researchJob.update({
        where: { id: jobId },
        data: {
          status: ResearchJobStatus.COMPLETED,
          completedAt: new Date(),
          progressPercent: 100,
          progressMessage: "Research complete",
        },
      });

      // Check if all jobs for this project are done
      const remaining = await prisma.researchJob.count({
        where: {
          projectId,
          status: {
            in: [ResearchJobStatus.QUEUED, ResearchJobStatus.RUNNING],
          },
        },
      });

      if (remaining === 0) {
        await prisma.project.update({
          where: { id: projectId },
          data: { status: ProjectStatus.researched },
        });
      }
    } catch (err) {
      logger.error(
        "Failed to update job status on completion",
        err instanceof Error ? err : undefined,
        { researchJobId: jobId },
      );
    }
  });

  worker.on("failed", async (job, err) => {
    logger.error("Job failed", err, { bullmqJobId: job?.id });

    if (job) {
      const { jobId } = job.data;
      try {
        await prisma.researchJob.update({
          where: { id: jobId },
          data: {
            status: ResearchJobStatus.FAILED,
            failedAt: new Date(),
            errorMessage: err.message,
            errorStack: err.stack,
            retryCount: job.attemptsMade,
          },
        });
      } catch (updateErr) {
        logger.error(
          "Failed to update job status on failure",
          updateErr instanceof Error ? updateErr : undefined,
          { researchJobId: jobId },
        );
      }
    }
  });

  worker.on("error", (err) => logger.error("Worker error", err));

  logger.info("Research worker started");
  return worker;
}

export async function stopResearchWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info("Research worker stopped");
  }
}
