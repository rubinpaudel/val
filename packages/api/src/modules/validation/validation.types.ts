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

// Validation task (used by research agent)
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

// Response types with serialized dates
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
