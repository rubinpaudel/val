import type { z } from "zod";
import type { ILogger } from "../../shared/logger";
import type {
  IResearchFramework,
  IResearchStage,
  ResearchInput,
  ResearchOptions,
  ValidationResult,
  FrameworkConfig,
  StageContext,
  StageResult,
} from "./framework.types";

// Delay helper for retry backoff
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Topological sort for stage ordering based on dependencies
function orderStagesByDependencies(stages: IResearchStage[]): IResearchStage[] {
  const stageMap = new Map(stages.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const result: IResearchStage[] = [];

  function visit(stage: IResearchStage): void {
    if (visited.has(stage.id)) return;
    visited.add(stage.id);

    for (const depId of stage.dependencies) {
      const dep = stageMap.get(depId);
      if (dep) visit(dep);
    }

    result.push(stage);
  }

  for (const stage of stages) {
    visit(stage);
  }

  return result;
}

export interface ResearchAgentDeps {
  logger: ILogger;
}

export abstract class BaseResearchAgent<TResult> implements IResearchFramework<TResult> {
  abstract readonly type: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly outputSchema: z.ZodType<TResult>;
  abstract readonly defaultConfig: FrameworkConfig;

  protected readonly logger: ILogger;

  constructor(deps: ResearchAgentDeps) {
    this.logger = deps.logger;
  }

  abstract getStages(): IResearchStage[];

  abstract validateInput(input: ResearchInput): ValidationResult;

  protected abstract synthesizeResults(
    results: Map<string, StageResult>,
    input: ResearchInput
  ): Promise<TResult>;

  async execute(input: ResearchInput, options?: ResearchOptions): Promise<TResult> {
    const config = { ...this.defaultConfig, ...options?.config };
    const stages = orderStagesByDependencies(this.getStages());
    const results = new Map<string, StageResult>();

    // Validate input before starting
    const validation = this.validateInput(input);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e) => e.message).join(", ");
      throw new Error(`Invalid research input: ${errorMessages}`);
    }

    // Log warnings
    for (const warning of validation.warnings) {
      this.logger.warn("Research input warning", { field: warning.field, message: warning.message });
    }

    const context: StageContext = {
      projectDescription: input.projectDescription,
      tasks: input.tasks,
      previousResults: new Map(),
      logger: this.logger,
    };

    let cumulativeProgress = 0;

    for (const stage of stages) {
      const stageStartProgress = cumulativeProgress;

      await options?.onProgress?.(stage.name, stageStartProgress, {
        currentStage: stage.name,
        totalStages: stages.length,
        stageProgress: 0,
      });

      try {
        // Copy previous results to context
        context.previousResults = new Map(
          Array.from(results.entries()).map(([k, v]) => [k, v.data])
        );

        const result = await this.executeStageWithRetry(stage, context, config);
        results.set(stage.id, result);

        cumulativeProgress += stage.weight;

        await options?.onProgress?.(stage.name, cumulativeProgress, {
          currentStage: stage.name,
          totalStages: stages.length,
          stageProgress: 100,
          sourcesFound: result.sources.length,
        });

        this.logger.debug("Stage completed", {
          stageId: stage.id,
          sourcesFound: result.sources.length,
        });
      } catch (error) {
        this.logger.error(`Stage ${stage.id} failed after retries`, error as Error);
        throw new StageExecutionError(stage.id, error as Error);
      }
    }

    // Synthesize final results
    await options?.onProgress?.("Synthesizing results", 95);
    const synthesized = await this.synthesizeResults(results, input);

    await options?.onProgress?.("Complete", 100);

    return synthesized;
  }

  private async executeStageWithRetry(
    stage: IResearchStage,
    context: StageContext,
    config: FrameworkConfig
  ): Promise<StageResult> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
      try {
        return await stage.execute(context);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Stage ${stage.id} attempt ${attempt + 1} failed`, {
          error: lastError.message,
          attempt: attempt + 1,
          maxAttempts: config.retryAttempts + 1,
        });

        if (attempt < config.retryAttempts) {
          const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s...
          await delay(backoffMs);
        }
      }
    }

    throw lastError;
  }
}

export class StageExecutionError extends Error {
  constructor(
    public readonly stageId: string,
    public readonly cause: Error
  ) {
    super(`Stage '${stageId}' failed: ${cause.message}`);
    this.name = "StageExecutionError";
  }
}
