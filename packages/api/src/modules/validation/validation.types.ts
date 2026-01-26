import type { FrameworkStatus, JobStatus } from "@val/db";

// Task template from framework definition
export interface TaskTemplate {
  category: string;
  title: string;
  description: string;
  helpText?: string;
  isRequired: boolean;
  priority: number;
}

// Research config from framework definition
export interface ResearchConfig {
  searchQueries: string[];
  sourcesTarget: number;
  maxDuration: number;
}

// Report schema from framework definition
export interface ReportSchema {
  sections: string[];
}

// Framework definition
export interface FrameworkDefinition {
  id: string;
  type: string;
  name: string;
  description: string;
  taskTemplates: TaskTemplate[];
  researchConfig: ResearchConfig;
  reportSchema: ReportSchema;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Validation framework (project instance)
export interface ValidationFramework {
  id: string;
  projectId: string;
  definitionId: string;
  definition?: FrameworkDefinition;
  status: FrameworkStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tasks?: ValidationTask[];
  report?: ResearchReport | null;
  job?: ResearchJob | null;
}

// Validation task
export interface ValidationTask {
  id: string;
  frameworkId: string;
  category: string;
  title: string;
  description: string;
  helpText: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  answer: string | null;
  priority: number;
  completedAt: Date | null;
  createdAt: Date;
}

// Research report
export interface ResearchReport {
  id: string;
  frameworkId: string;
  summaryScore: number | null;
  summaryVerdict: string | null;
  summaryPoints: unknown;
  sections: unknown;
  sourcesCount: number;
  rawData: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Research job
export interface ResearchJob {
  id: string;
  frameworkId: string;
  bullJobId: string | null;
  status: JobStatus;
  progress: number;
  currentStep: string | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Input types
export interface InitializeFrameworkInput {
  projectId: string;
  frameworkType: string;
}

export interface CompleteTaskInput {
  taskId: string;
  answer: string;
}

export interface StartResearchInput {
  frameworkId: string;
}

// Response types
export interface ValidationFrameworkResponse {
  id: string;
  projectId: string;
  type: string;
  name: string;
  description: string;
  status: FrameworkStatus;
  tasks: ValidationTaskResponse[];
  completedTasksCount: number;
  totalTasksCount: number;
  requiredTasksCount: number;
  completedRequiredTasksCount: number;
  isReadyForResearch: boolean;
  report: ResearchReportResponse | null;
  job: ResearchJobResponse | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ValidationTaskResponse {
  id: string;
  category: string;
  title: string;
  description: string;
  helpText: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  answer: string | null;
  priority: number;
  completedAt: string | null;
}

export interface ResearchReportResponse {
  id: string;
  summaryScore: number | null;
  summaryVerdict: string | null;
  summaryPoints: unknown;
  sections: unknown;
  sourcesCount: number;
  createdAt: string;
}

export interface ResearchJobResponse {
  id: string;
  status: JobStatus;
  progress: number;
  currentStep: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

// Readiness check result
export interface ReadinessCheckResult {
  isReady: boolean;
  completedRequiredTasks: number;
  totalRequiredTasks: number;
  missingTasks: string[];
}
