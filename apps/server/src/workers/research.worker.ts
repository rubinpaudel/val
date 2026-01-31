import { Worker, Job } from "bullmq";
import { getRedisConnectionOptions } from "../lib/redis";
import { RESEARCH_QUEUE, type ResearchJobData } from "../lib/queue";
import { Logger } from "@val/api/shared";

const logger = new Logger(
  { service: "research-worker" },
  process.env.NODE_ENV === "production" ? "info" : "debug"
);

// Process research job - placeholder for future implementation
async function processResearchJob(job: Job<ResearchJobData>): Promise<void> {
  logger.info("Research job received", { jobId: job.id, data: job.data });

  // TODO: Implement research processing
  throw new Error("Research processing not yet implemented");
}

// Worker singleton
let worker: Worker<ResearchJobData> | null = null;

export function startResearchWorker(): Worker<ResearchJobData> {
  if (worker) return worker;

  worker = new Worker<ResearchJobData>(RESEARCH_QUEUE, processResearchJob, {
    connection: getRedisConnectionOptions(),
    concurrency: 2,
  });

  worker.on("completed", (job) =>
    logger.info("Job completed", { jobId: job.id })
  );
  worker.on("failed", (job, err) =>
    logger.error("Job failed", err, { jobId: job?.id })
  );
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
