-- Fix: Scope the active job constraint to ORCHESTRATOR only.
-- The previous index prevented ANY two QUEUED/RUNNING jobs per project,
-- which blocks COMPETITOR_INTEL sub-jobs from being created while the
-- ORCHESTRATOR is still RUNNING.

DROP INDEX "research_job_project_active_unique";

CREATE UNIQUE INDEX "research_job_project_active_unique" ON "research_job"("projectId")
WHERE "status" IN ('QUEUED', 'RUNNING') AND "agentType" = 'ORCHESTRATOR';

COMMENT ON INDEX "research_job_project_active_unique" IS 'Ensures only one active (QUEUED/RUNNING) ORCHESTRATOR job per project. Sub-jobs (COMPETITOR_INTEL, etc.) are allowed to run concurrently.';
