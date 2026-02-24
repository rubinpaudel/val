-- DropIndex
DROP INDEX "research_job_project_active_unique";

-- RenameIndex
ALTER INDEX "research_job_job_dedup_key" RENAME TO "research_job_projectId_agentType_configHash_key";
