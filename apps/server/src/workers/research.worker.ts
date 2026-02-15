import { Worker, Job } from "bullmq";
import prisma, { ResearchJobStatus, ProjectStatus } from "@val/db";
import { getRedisConnectionOptions } from "../lib/redis";
import { RESEARCH_QUEUE, type ResearchJobData } from "../lib/queue";
import { Logger } from "@val/api/shared";

const logger = new Logger(
  { service: "research-worker" },
  process.env.NODE_ENV === "production" ? "info" : "debug"
);

async function processResearchJob(job: Job<ResearchJobData>): Promise<void> {
  const { frameworkId, projectId } = job.data;

  logger.info("Research job received", {
    jobId: job.id,
    researchJobId: frameworkId,
    projectId,
  });

  // Mark job as RUNNING in the database
  await prisma.researchJob.update({
    where: { id: frameworkId },
    data: {
      status: ResearchJobStatus.RUNNING,
      startedAt: new Date(),
      progressPercent: 0,
      progressMessage: "Starting research...",
    },
  });

  // TODO: Implement actual research agent here
  throw new Error("Research agent not yet implemented");
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
    const { frameworkId, projectId } = job.data;
    logger.info("Job completed", { jobId: job.id, researchJobId: frameworkId });

    try {
      await prisma.researchJob.update({
        where: { id: frameworkId },
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
        { researchJobId: frameworkId },
      );
    }
  });

  worker.on("failed", async (job, err) => {
    logger.error("Job failed", err, { jobId: job?.id });

    if (job) {
      const { frameworkId } = job.data;
      try {
        await prisma.researchJob.update({
          where: { id: frameworkId },
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
          { researchJobId: frameworkId },
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
