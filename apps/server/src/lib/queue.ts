import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "./redis";
import { researchConfig } from "../config/research.config";
import { Logger } from "@val/api/shared";

const logger = new Logger({ service: "research-queue" });

export const RESEARCH_QUEUE = "research";
export const DEFAULT_JOB_TIMEOUT = researchConfig.queue.jobTimeoutMs;

export interface ResearchJobData {
  jobId: string;
  agentType: string;
  projectId: string;
  projectDescription: string;
  maxDuration?: number;
}

// Lazy-initialized queue singleton
let researchQueue: Queue<ResearchJobData> | null = null;

function getQueue(): Queue<ResearchJobData> {
  if (!researchQueue) {
    researchQueue = new Queue<ResearchJobData>(RESEARCH_QUEUE, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: researchConfig.queue.maxRetries,
        backoff: {
          type: "exponential",
          delay: researchConfig.queue.retryBackoffMs,
        },
        removeOnComplete: { age: 24 * 60 * 60, count: 100 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    });
  }
  return researchQueue;
}

export async function addResearchJob(data: ResearchJobData): Promise<{ bullmqJobId: string }> {
  const job = await getQueue().add(data.agentType, data, {
    jobId: `research-${data.jobId}`,
  });

  logger.info("Research job added", {
    researchJobId: data.jobId,
    agentType: data.agentType,
    bullmqJobId: job.id,
  });

  return { bullmqJobId: job.id ?? `research-${data.jobId}` };
}

export async function closeQueues(): Promise<void> {
  if (researchQueue) {
    await researchQueue.close();
    researchQueue = null;
  }
}
