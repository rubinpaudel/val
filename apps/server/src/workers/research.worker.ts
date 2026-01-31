import { Worker, Job } from "bullmq";
import prisma, { Prisma } from "@val/db";
import { getRedisConnectionOptions } from "../lib/redis";
import { RESEARCH_QUEUE, DEFAULT_JOB_TIMEOUT, type ResearchJobData } from "../lib/queue";
import { createFrameworkRegistry, type IFrameworkRegistry } from "@val/api/frameworks";
import { Logger } from "@val/api/shared";

// Create logger and framework registry
const logger = new Logger({ service: "research-worker" }, process.env.NODE_ENV === "production" ? "info" : "debug");
let frameworkRegistry: IFrameworkRegistry | null = null;

function getFrameworkRegistry(): IFrameworkRegistry {
  if (!frameworkRegistry) {
    frameworkRegistry = createFrameworkRegistry(logger);
  }
  return frameworkRegistry;
}

// Generic result interface - frameworks should return data matching this structure
interface ResearchResult {
  synthesis?: {
    summaryScore?: number;
    summaryVerdict?: string;
    summaryPoints?: string[];
    recommendations?: string[];
    sections?: Record<string, unknown>;
  };
  sections?: Record<string, { content?: string; sources?: Array<{ title: string; url: string }> }>;
  allSources?: Array<{ title: string; url: string }>;
}

// Process research job
async function processResearchJob(job: Job<ResearchJobData>): Promise<void> {
  const { frameworkId, frameworkType, projectDescription, maxDuration } = job.data;
  const timeout = maxDuration || DEFAULT_JOB_TIMEOUT;

  logger.info(`Starting research job`, { frameworkId, frameworkType });

  // Get framework from registry
  const registry = getFrameworkRegistry();
  const framework = registry.get(frameworkType);

  if (!framework) {
    const availableTypes = registry.listTypes().map((info) => info.type).join(", ") || "(none registered)";
    throw new Error(`Unknown framework type: ${frameworkType}. Available: ${availableTypes}`);
  }

  // Get framework with tasks
  const validationFramework = await prisma.validationFramework.findUnique({
    where: { id: frameworkId },
    include: { tasks: { orderBy: { priority: "asc" } } },
  });

  if (!validationFramework) throw new Error(`Framework not found: ${frameworkId}`);

  // Update job status to ACTIVE
  await prisma.researchJob.update({
    where: { frameworkId },
    data: { status: "ACTIVE", bullJobId: job.id, startedAt: new Date(), currentStep: "Initializing..." },
  });

  try {
    // Progress callback - updates both BullMQ and database
    const onProgress = async (step: string, progress: number) => {
      await Promise.all([
        job.updateProgress(progress),
        prisma.researchJob.update({
          where: { frameworkId },
          data: { progress, currentStep: step },
        }),
      ]);
      logger.debug(`Progress update`, { frameworkId, step, progress });
    };

    // Conduct research with timeout using framework registry
    const researchPromise = framework.execute(
      {
        projectDescription,
        tasks: validationFramework.tasks,
      },
      { onProgress }
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Research timed out after ${Math.round(timeout / 60000)} minutes`)), timeout)
    );

    const result = (await Promise.race([researchPromise, timeoutPromise])) as ResearchResult;

    // Store report - structure is framework-agnostic
    await prisma.researchReport.upsert({
      where: { frameworkId },
      create: {
        frameworkId,
        summaryScore: result.synthesis?.summaryScore ?? null,
        summaryVerdict: result.synthesis?.summaryVerdict ?? null,
        summaryPoints: (result.synthesis?.summaryPoints ?? []) as Prisma.InputJsonValue,
        sections: (result.synthesis?.sections ?? {}) as Prisma.InputJsonValue,
        sourcesCount: result.allSources?.length ?? 0,
        rawData: result as unknown as Prisma.InputJsonValue,
      },
      update: {
        summaryScore: result.synthesis?.summaryScore ?? null,
        summaryVerdict: result.synthesis?.summaryVerdict ?? null,
        summaryPoints: (result.synthesis?.summaryPoints ?? []) as Prisma.InputJsonValue,
        sections: (result.synthesis?.sections ?? {}) as Prisma.InputJsonValue,
        sourcesCount: result.allSources?.length ?? 0,
        rawData: result as unknown as Prisma.InputJsonValue,
      },
    });

    // Mark completed
    await Promise.all([
      prisma.researchJob.update({
        where: { frameworkId },
        data: { status: "COMPLETED", progress: 100, currentStep: "Complete", completedAt: new Date() },
      }),
      prisma.validationFramework.update({
        where: { id: frameworkId },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
    ]);

    logger.info(`Research completed`, {
      frameworkId,
      sourcesCount: result.allSources?.length ?? 0,
      score: result.synthesis?.summaryScore,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Research failed`, err instanceof Error ? err : undefined, { frameworkId });

    await Promise.all([
      prisma.researchJob.update({
        where: { frameworkId },
        data: { status: "FAILED", error: errorMessage, completedAt: new Date() },
      }),
      prisma.validationFramework.update({
        where: { id: frameworkId },
        data: { status: "FAILED" },
      }),
    ]);

    throw err;
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

  worker.on("completed", (job) => logger.info(`Job completed`, { frameworkId: job.data.frameworkId }));
  worker.on("failed", (job, err) => logger.error(`Job failed`, err, { frameworkId: job?.data.frameworkId }));
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
