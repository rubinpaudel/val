-- CreateEnum
CREATE TYPE "FrameworkStatus" AS ENUM ('PENDING_INFO', 'READY', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "framework_definition" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "taskTemplates" JSONB NOT NULL,
    "researchConfig" JSONB NOT NULL,
    "reportSchema" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "framework_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_framework" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "status" "FrameworkStatus" NOT NULL DEFAULT 'PENDING_INFO',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validation_framework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_task" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "answer" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_report" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "summaryScore" INTEGER,
    "summaryVerdict" TEXT,
    "summaryPoints" JSONB,
    "sections" JSONB,
    "sourcesCount" INTEGER NOT NULL DEFAULT 0,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_job" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "bullJobId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "framework_definition_type_key" ON "framework_definition"("type");

-- CreateIndex
CREATE INDEX "validation_framework_projectId_idx" ON "validation_framework"("projectId");

-- CreateIndex
CREATE INDEX "validation_framework_status_idx" ON "validation_framework"("status");

-- CreateIndex
CREATE UNIQUE INDEX "validation_framework_projectId_definitionId_key" ON "validation_framework"("projectId", "definitionId");

-- CreateIndex
CREATE INDEX "validation_task_frameworkId_idx" ON "validation_task"("frameworkId");

-- CreateIndex
CREATE INDEX "validation_task_isCompleted_idx" ON "validation_task"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "research_report_frameworkId_key" ON "research_report"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "research_job_frameworkId_key" ON "research_job"("frameworkId");

-- AddForeignKey
ALTER TABLE "validation_framework" ADD CONSTRAINT "validation_framework_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_framework" ADD CONSTRAINT "validation_framework_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "framework_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_task" ADD CONSTRAINT "validation_task_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "validation_framework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_report" ADD CONSTRAINT "research_report_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "validation_framework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_job" ADD CONSTRAINT "research_job_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "validation_framework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
