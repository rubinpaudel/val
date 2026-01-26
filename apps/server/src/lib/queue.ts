import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "./redis";

// Queue names
export const RESEARCH_QUEUE = "research";

// Job data types
export interface ResearchJobData {
  frameworkId: string;
  projectId: string;
  projectDescription: string;
}

// Create queues
let researchQueue: Queue<ResearchJobData> | null = null;

export function getResearchQueue(): Queue<ResearchJobData> {
  if (!researchQueue) {
    researchQueue = new Queue<ResearchJobData>(RESEARCH_QUEUE, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60, // Keep completed jobs for 24 hours
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
        },
      },
    });

    researchQueue.on("error", (error) => {
      console.error("Research queue error:", error);
    });
  }

  return researchQueue;
}

// Helper to add a research job
export async function addResearchJob(
  data: ResearchJobData
): Promise<{ jobId: string }> {
  const queue = getResearchQueue();

  const job = await queue.add("psf-research", data, {
    jobId: `research-${data.frameworkId}`,
  });

  console.log(`Research job added: ${job.id} for framework ${data.frameworkId}`);

  return { jobId: job.id! };
}

// Close queues gracefully
export async function closeQueues(): Promise<void> {
  if (researchQueue) {
    await researchQueue.close();
    researchQueue = null;
    console.log("Research queue closed");
  }
}
