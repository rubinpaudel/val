import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "./redis";

export const RESEARCH_QUEUE = "research";
export const DEFAULT_JOB_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export interface ResearchJobData {
  frameworkId: string;
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
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 100 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    });
  }
  return researchQueue;
}

export async function addResearchJob(data: ResearchJobData): Promise<{ jobId: string }> {
  const job = await getQueue().add("psf-research", data, {
    jobId: `research-${data.frameworkId}`,
  });
  console.log(`Research job added: ${data.frameworkId}`);
  return { jobId: job.id! };
}

export async function closeQueues(): Promise<void> {
  if (researchQueue) {
    await researchQueue.close();
    researchQueue = null;
  }
}
