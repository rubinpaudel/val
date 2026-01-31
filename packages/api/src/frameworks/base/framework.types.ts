import type { z } from "zod";
import type { ValidationTask } from "../../modules/validation/validation.types";
import type { ILogger } from "../../shared/logger";

// Research source from AI grounding
export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
}

// Input for research execution
export interface ResearchInput {
  projectDescription: string;
  tasks: ValidationTask[];
  context?: Record<string, unknown>;
}

// Progress callback for tracking research execution
export type ProgressCallback = (
  stage: string,
  progress: number,
  details?: ProgressDetails
) => Promise<void>;

export interface ProgressDetails {
  currentStage: string;
  totalStages: number;
  stageProgress: number;
  sourcesFound?: number;
}

// Options for research execution
export interface ResearchOptions {
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  config?: Partial<FrameworkConfig>;
}

// Framework configuration
export interface FrameworkConfig {
  maxDuration: number; // Max research time in ms
  sourcesTarget: number; // Target number of sources
  retryAttempts: number; // Retry failed stages
}

// Validation result for input checking
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// Framework type info for listing
export interface FrameworkTypeInfo {
  type: string;
  name: string;
  description: string;
}

// Section research result
export interface SectionResearch {
  content: string;
  sources: ResearchSource[];
  searchQueries: string[];
}

// Context passed to research stages
export interface StageContext {
  projectDescription: string;
  tasks: ValidationTask[];
  previousResults: Map<string, unknown>;
  logger: ILogger;
}

// Stage execution result
export interface StageResult<T = unknown> {
  data: T;
  sources: ResearchSource[];
  searchQueries: string[];
}

// Research framework interface
export interface IResearchFramework<TResult = unknown> {
  readonly type: string;
  readonly name: string;
  readonly description: string;
  readonly outputSchema: z.ZodType<TResult>;
  readonly defaultConfig: FrameworkConfig;

  execute(input: ResearchInput, options?: ResearchOptions): Promise<TResult>;
  getStages(): IResearchStage[];
  validateInput(input: ResearchInput): ValidationResult;
}

// Research stage interface
export interface IResearchStage<TOutput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly weight: number; // For progress calculation (0-100)
  readonly dependencies: string[]; // IDs of stages this depends on

  execute(context: StageContext): Promise<StageResult<TOutput>>;
}
