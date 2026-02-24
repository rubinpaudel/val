-- Add configHash field for idempotent sub-job creation
ALTER TABLE "research_job" ADD COLUMN "configHash" TEXT;

-- Create unique constraint for job deduplication (prevents duplicate sub-jobs on retry)
CREATE UNIQUE INDEX "research_job_job_dedup_key" ON "research_job"("projectId", "agentType", "configHash");

-- Create partial unique index to prevent multiple active research jobs per project (fixes race condition)
CREATE UNIQUE INDEX "research_job_project_active_unique" ON "research_job"("projectId")
WHERE "status" IN ('QUEUED', 'RUNNING');

-- Add comments for documentation
COMMENT ON INDEX "research_job_project_active_unique" IS 'Ensures only one active (QUEUED/RUNNING) research job per project at a time. Prevents race conditions during concurrent research starts.';
COMMENT ON INDEX "research_job_job_dedup_key" IS 'Prevents duplicate sub-jobs during retries by creating a unique key from projectId + agentType + config hash.';
