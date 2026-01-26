import { Worker, Job } from "bullmq";
import prisma, { Prisma } from "@val/db";
import { getRedisConnectionOptions } from "../lib/redis";
import { RESEARCH_QUEUE, DEFAULT_JOB_TIMEOUT, type ResearchJobData } from "../lib/queue";
import { conductPSFResearch } from "@val/api/agents";

// Helper to run with timeout
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// Update job status in database
async function updateJobStatus(
  frameworkId: string,
  status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED",
  additionalData?: {
    bullJobId?: string;
    progress?: number;
    currentStep?: string;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  }
): Promise<void> {
  await prisma.researchJob.update({
    where: { frameworkId },
    data: {
      status,
      ...additionalData,
    },
  });
}

// Update framework status in database
async function updateFrameworkStatus(
  frameworkId: string,
  status: "PENDING_INFO" | "READY" | "IN_PROGRESS" | "COMPLETED" | "FAILED",
  additionalData?: {
    startedAt?: Date;
    completedAt?: Date;
  }
): Promise<void> {
  await prisma.validationFramework.update({
    where: { id: frameworkId },
    data: {
      status,
      ...additionalData,
    },
  });
}

// Store research report in database
async function storeResearchReport(
  frameworkId: string,
  result: Awaited<ReturnType<typeof conductPSFResearch>>
): Promise<void> {
  // Build the sections object for storage
  const sectionsData = {
    problemEvidence: {
      ...result.synthesis.sections.problemEvidence,
      content: result.problemEvidence.content,
      sources: result.problemEvidence.sources,
    },
    competitorAnalysis: {
      ...result.synthesis.sections.competitorAnalysis,
      content: result.competitorAnalysis.content,
      sources: result.competitorAnalysis.sources,
    },
    marketSignals: {
      ...result.synthesis.sections.marketSignals,
      content: result.marketSignals.content,
      sources: result.marketSignals.sources,
    },
    recommendations: result.synthesis.recommendations,
  };

  // Build the raw data object for storage
  const rawDataObj = {
    problemEvidence: result.problemEvidence,
    competitorAnalysis: result.competitorAnalysis,
    marketSignals: result.marketSignals,
    allSources: result.allSources,
  };

  await prisma.researchReport.upsert({
    where: { frameworkId },
    create: {
      frameworkId,
      summaryScore: result.synthesis.summaryScore,
      summaryVerdict: result.synthesis.summaryVerdict,
      summaryPoints: result.synthesis.summaryPoints as Prisma.InputJsonValue,
      sections: sectionsData as unknown as Prisma.InputJsonValue,
      sourcesCount: result.allSources.length,
      rawData: rawDataObj as unknown as Prisma.InputJsonValue,
    },
    update: {
      summaryScore: result.synthesis.summaryScore,
      summaryVerdict: result.synthesis.summaryVerdict,
      summaryPoints: result.synthesis.summaryPoints as Prisma.InputJsonValue,
      sections: sectionsData as unknown as Prisma.InputJsonValue,
      sourcesCount: result.allSources.length,
      rawData: rawDataObj as unknown as Prisma.InputJsonValue,
    },
  });
}

// Get framework tasks for research
async function getFrameworkTasks(frameworkId: string) {
  const framework = await prisma.validationFramework.findUnique({
    where: { id: frameworkId },
    include: {
      tasks: {
        orderBy: { priority: "asc" },
      },
      project: true,
    },
  });

  if (!framework) {
    throw new Error(`Framework not found: ${frameworkId}`);
  }

  return {
    tasks: framework.tasks,
    projectDescription: framework.project.description,
  };
}

// Process research job
async function processResearchJob(job: Job<ResearchJobData>): Promise<void> {
  const { frameworkId, projectDescription, maxDuration } = job.data;
  const timeout = maxDuration || DEFAULT_JOB_TIMEOUT;

  console.log(`Starting research job for framework: ${frameworkId} (timeout: ${timeout}ms)`);

  // Update job status to ACTIVE
  await updateJobStatus(frameworkId, "ACTIVE", {
    bullJobId: job.id,
    startedAt: new Date(),
    currentStep: "Initializing research...",
  });

  try {
    // Get framework tasks
    const { tasks } = await getFrameworkTasks(frameworkId);

    // Progress callback
    const onProgress = async (step: string, progress: number) => {
      await job.updateProgress(progress);
      await updateJobStatus(frameworkId, "ACTIVE", {
        progress,
        currentStep: step,
      });
      console.log(`[${frameworkId}] ${step} (${progress}%)`);
    };

    // Conduct research with timeout
    const result = await withTimeout(
      conductPSFResearch(projectDescription, tasks, onProgress),
      timeout,
      `Research timed out after ${Math.round(timeout / 60000)} minutes`
    );

    // Store report
    await storeResearchReport(frameworkId, result);

    // Update statuses to COMPLETED
    await updateJobStatus(frameworkId, "COMPLETED", {
      progress: 100,
      currentStep: "Research complete",
      completedAt: new Date(),
    });

    await updateFrameworkStatus(frameworkId, "COMPLETED", {
      completedAt: new Date(),
    });

    console.log(`Research completed for framework: ${frameworkId}`);
    console.log(`Found ${result.allSources.length} sources, score: ${result.synthesis.summaryScore}/10`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Research failed for framework: ${frameworkId}`, error);

    // Update statuses to FAILED
    await updateJobStatus(frameworkId, "FAILED", {
      error: errorMessage,
      completedAt: new Date(),
    });

    await updateFrameworkStatus(frameworkId, "FAILED");

    throw error; // Re-throw to trigger BullMQ retry logic
  }
}

// Create and start the worker
let worker: Worker<ResearchJobData> | null = null;

export function startResearchWorker(): Worker<ResearchJobData> {
  if (worker) {
    console.log("Research worker already running");
    return worker;
  }

  worker = new Worker<ResearchJobData>(RESEARCH_QUEUE, processResearchJob, {
    connection: getRedisConnectionOptions(),
    concurrency: 2, // Process 2 jobs at a time
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed for framework ${job.data.frameworkId}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error("Worker error:", error);
  });

  console.log("Research worker started");

  return worker;
}

export async function stopResearchWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log("Research worker stopped");
  }
}
