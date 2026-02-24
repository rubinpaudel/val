-- CreateEnum
CREATE TYPE "research_job_status" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "research_agent_type" AS ENUM ('ORCHESTRATOR', 'COMPETITOR_INTEL', 'MARKET_SIZING', 'BUSINESS_MODEL', 'TECHNICAL_FEASIBILITY', 'REGULATORY', 'TIMING_TRENDS');

-- CreateTable
CREATE TABLE "research_job" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "agentType" "research_agent_type" NOT NULL,
    "status" "research_job_status" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "progressMessage" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "resultsSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "research_job_projectId_idx" ON "research_job"("projectId");

-- CreateIndex
CREATE INDEX "research_job_status_idx" ON "research_job"("status");

-- CreateIndex
CREATE INDEX "research_job_agentType_idx" ON "research_job"("agentType");

-- CreateIndex
CREATE INDEX "research_job_queuedAt_idx" ON "research_job"("queuedAt" DESC);

-- AddForeignKey
ALTER TABLE "research_job" ADD CONSTRAINT "research_job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
