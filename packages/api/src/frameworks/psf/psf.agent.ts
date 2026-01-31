import {
  BaseResearchAgent,
  type IResearchStage,
  type ResearchInput,
  type ValidationResult,
  type FrameworkConfig,
  type StageResult,
  type ResearchSource,
} from "../base";
import { psfSynthesisSchema, type PSFResearchResult, type SectionResearchData, type PSFSynthesis } from "./psf.schema";
import {
  ProblemEvidenceStage,
  CompetitorAnalysisStage,
  MarketSignalsStage,
  SynthesisStage,
} from "./stages";

// Normalize URL for deduplication
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// Collect all unique sources from research
function collectAllSources(...sectionSources: ResearchSource[][]): ResearchSource[] {
  const allSources = sectionSources.flat();

  // Deduplicate by normalized URL
  const seenUrls = new Map<string, ResearchSource>();
  for (const source of allSources) {
    const normalizedUrl = normalizeUrl(source.url);
    // Keep the first occurrence (prefer earlier sources)
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.set(normalizedUrl, source);
    }
  }

  return Array.from(seenUrls.values());
}

export class PSFAgent extends BaseResearchAgent<PSFResearchResult> {
  readonly type = "PROBLEM_SOLUTION_FIT";
  readonly name = "Problem-Solution Fit Analysis";
  readonly description =
    "Validates whether a real problem exists and assesses the competitive landscape and market timing for a startup idea.";
  readonly outputSchema = psfSynthesisSchema.transform((synthesis) => ({
    problemEvidence: { content: "", sources: [], searchQueries: [] },
    competitorAnalysis: { content: "", sources: [], searchQueries: [] },
    marketSignals: { content: "", sources: [], searchQueries: [] },
    synthesis,
    allSources: [],
  }));

  readonly defaultConfig: FrameworkConfig = {
    maxDuration: 1800000, // 30 minutes
    sourcesTarget: 15,
    retryAttempts: 2,
  };

  private readonly stages: IResearchStage[];

  constructor(deps: { logger: import("../../shared/logger").ILogger }) {
    super(deps);
    this.stages = [
      new ProblemEvidenceStage(),
      new CompetitorAnalysisStage(),
      new MarketSignalsStage(),
      new SynthesisStage(),
    ];
  }

  getStages(): IResearchStage[] {
    return this.stages;
  }

  validateInput(input: ResearchInput): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Check project description
    if (!input.projectDescription || input.projectDescription.trim().length < 10) {
      errors.push({
        field: "projectDescription",
        message: "Project description must be at least 10 characters",
      });
    }

    // Check for completed tasks
    const completedTasks = input.tasks.filter((t) => t.isCompleted && t.answer);
    if (completedTasks.length === 0) {
      warnings.push({
        field: "tasks",
        message: "No completed tasks found. Research may be less accurate without founder input.",
      });
    }

    // Check for required tasks
    const requiredTasks = input.tasks.filter((t) => t.isRequired);
    const completedRequiredTasks = requiredTasks.filter((t) => t.isCompleted && t.answer);
    if (completedRequiredTasks.length < requiredTasks.length) {
      const missing = requiredTasks.length - completedRequiredTasks.length;
      errors.push({
        field: "tasks",
        message: `${missing} required task(s) not completed`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  protected async synthesizeResults(
    results: Map<string, StageResult>,
    _input: ResearchInput
  ): Promise<PSFResearchResult> {
    const problemEvidence = results.get("problem-evidence")?.data as SectionResearchData;
    const competitorAnalysis = results.get("competitor-analysis")?.data as SectionResearchData;
    const marketSignals = results.get("market-signals")?.data as SectionResearchData;
    const synthesis = results.get("synthesis")?.data as PSFSynthesis;

    // Collect all unique sources
    const allSources = collectAllSources(
      problemEvidence?.sources || [],
      competitorAnalysis?.sources || [],
      marketSignals?.sources || []
    );

    return {
      problemEvidence: problemEvidence || { content: "", sources: [], searchQueries: [] },
      competitorAnalysis: competitorAnalysis || { content: "", sources: [], searchQueries: [] },
      marketSignals: marketSignals || { content: "", sources: [], searchQueries: [] },
      synthesis,
      allSources,
    };
  }
}
