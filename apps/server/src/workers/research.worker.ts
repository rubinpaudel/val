import { Worker, Job } from "bullmq";
import prisma, { Prisma } from "@val/db";
import { getRedisConnectionOptions } from "../lib/redis";
import { RESEARCH_QUEUE, DEFAULT_JOB_TIMEOUT, type ResearchJobData } from "../lib/queue";
import { conductPSFResearch } from "@val/api/agents";

// Process research job
async function processResearchJob(job: Job<ResearchJobData>): Promise<void> {
  const { frameworkId, projectDescription, maxDuration } = job.data;
  const timeout = maxDuration || DEFAULT_JOB_TIMEOUT;

  console.log(`Starting research job: ${frameworkId}`);

  // Get framework with tasks
  const framework = await prisma.validationFramework.findUnique({
    where: { id: frameworkId },
    include: { tasks: { orderBy: { priority: "asc" } } },
  });

  if (!framework) throw new Error(`Framework not found: ${frameworkId}`);

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
      console.log(`[${frameworkId}] ${step} (${progress}%)`);
    };

    // Conduct research with timeout
    const researchPromise = conductPSFResearch(projectDescription, framework.tasks, onProgress);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Research timed out after ${Math.round(timeout / 60000)} minutes`)), timeout)
    );

    const result = await Promise.race([researchPromise, timeoutPromise]);

    // Store report
    const sectionsData = {
      problemEvidence: { ...result.synthesis.sections.problemEvidence, content: result.problemEvidence.content, sources: result.problemEvidence.sources },
      competitorAnalysis: { ...result.synthesis.sections.competitorAnalysis, content: result.competitorAnalysis.content, sources: result.competitorAnalysis.sources },
      marketSignals: { ...result.synthesis.sections.marketSignals, content: result.marketSignals.content, sources: result.marketSignals.sources },
      recommendations: result.synthesis.recommendations,
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
        rawData: { problemEvidence: result.problemEvidence, competitorAnalysis: result.competitorAnalysis, marketSignals: result.marketSignals, allSources: result.allSources } as unknown as Prisma.InputJsonValue,
      },
      update: {
        summaryScore: result.synthesis.summaryScore,
        summaryVerdict: result.synthesis.summaryVerdict,
        summaryPoints: result.synthesis.summaryPoints as Prisma.InputJsonValue,
        sections: sectionsData as unknown as Prisma.InputJsonValue,
        sourcesCount: result.allSources.length,
        rawData: { problemEvidence: result.problemEvidence, competitorAnalysis: result.competitorAnalysis, marketSignals: result.marketSignals, allSources: result.allSources } as unknown as Prisma.InputJsonValue,
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

    console.log(`Research completed: ${frameworkId} (${result.allSources.length} sources, score: ${result.synthesis.summaryScore}/10)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Research failed: ${frameworkId}`, error);

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

    throw error;
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

  worker.on("completed", (job) => console.log(`Job completed: ${job.data.frameworkId}`));
  worker.on("failed", (job, err) => console.error(`Job failed: ${job?.data.frameworkId}`, err.message));
  worker.on("error", (err) => console.error("Worker error:", err));

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
