import {
  generateWithGrounding,
  generateStructuredOutput,
  type ResearchSource,
} from "./ai.client";
import {
  buildProblemEvidencePrompt,
  buildCompetitorAnalysisPrompt,
  buildMarketSignalsPrompt,
  buildReportSynthesisPrompt,
  type ResearchContext,
} from "./prompts/psf-analysis.prompt";
import {
  psfSynthesisSchema,
  type PSFSynthesis,
  type SectionAnalysis,
} from "./schemas/psf.schema";
import type { ValidationTask } from "../modules/validation/validation.types";

// Result types
export interface SectionResearch {
  content: string;
  sources: ResearchSource[];
  searchQueries: string[];
}

export interface PSFResearchResult {
  problemEvidence: SectionResearch;
  competitorAnalysis: SectionResearch;
  marketSignals: SectionResearch;
  synthesis: PSFSynthesis;
  allSources: ResearchSource[];
}

// Re-export types for external use
export type { PSFSynthesis, SectionAnalysis };

// Generic section research function
async function conductSectionResearch(
  context: ResearchContext,
  buildPrompt: (ctx: ResearchContext) => string
): Promise<SectionResearch> {
  return generateWithGrounding(buildPrompt(context));
}

// Fallback synthesis when AI generation fails
const FALLBACK_SYNTHESIS: PSFSynthesis = {
  summaryScore: 5,
  summaryVerdict: "MODERATE",
  summaryPoints: [
    "Research completed but synthesis failed to generate properly",
    "Please review the raw research data for detailed findings",
    "Consider re-running the analysis",
  ],
  sections: {
    problemEvidence: {
      score: 5,
      keyFindings: ["See raw research data"],
      concerns: ["Synthesis generation failed"],
    },
    competitorAnalysis: {
      score: 5,
      keyFindings: ["See raw research data"],
      concerns: ["Synthesis generation failed"],
    },
    marketSignals: {
      score: 5,
      keyFindings: ["See raw research data"],
      concerns: ["Synthesis generation failed"],
    },
  },
  recommendations: [
    "Review the raw research data manually",
    "Re-run the synthesis if needed",
    "Check the AI service logs for errors",
  ],
};

// Synthesize all research into final report using structured output
export async function synthesizeReport(
  context: ResearchContext,
  problemEvidence: SectionResearch,
  competitorAnalysis: SectionResearch,
  marketSignals: SectionResearch
): Promise<PSFSynthesis> {
  const prompt = buildReportSynthesisPrompt(
    context,
    problemEvidence.content,
    competitorAnalysis.content,
    marketSignals.content
  );

  try {
    return await generateStructuredOutput(prompt, psfSynthesisSchema);
  } catch (error) {
    console.error("Failed to generate synthesis:", error);
    return FALLBACK_SYNTHESIS;
  }
}

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
function collectAllSources(
  problemEvidence: SectionResearch,
  competitorAnalysis: SectionResearch,
  marketSignals: SectionResearch
): ResearchSource[] {
  const allSources = [
    ...problemEvidence.sources,
    ...competitorAnalysis.sources,
    ...marketSignals.sources,
  ];

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

// Main research function - conducts full PSF analysis
export async function conductPSFResearch(
  projectDescription: string,
  tasks: ValidationTask[],
  onProgress?: (step: string, progress: number) => Promise<void>
): Promise<PSFResearchResult> {
  const context: ResearchContext = { projectDescription, tasks };

  // Step 1: Problem Evidence Research (0-30%)
  await onProgress?.("Researching problem evidence...", 10);
  const problemEvidence = await conductSectionResearch(context, buildProblemEvidencePrompt);
  await onProgress?.("Problem evidence research complete", 30);

  // Step 2: Competitor Analysis (30-60%)
  await onProgress?.("Analyzing competitors...", 35);
  const competitorAnalysis = await conductSectionResearch(context, buildCompetitorAnalysisPrompt);
  await onProgress?.("Competitor analysis complete", 60);

  // Step 3: Market Signals (60-80%)
  await onProgress?.("Researching market signals...", 65);
  const marketSignals = await conductSectionResearch(context, buildMarketSignalsPrompt);
  await onProgress?.("Market signals research complete", 80);

  // Step 4: Synthesize Report (80-100%)
  await onProgress?.("Synthesizing final report...", 85);
  const synthesis = await synthesizeReport(context, problemEvidence, competitorAnalysis, marketSignals);
  await onProgress?.("Report synthesis complete", 100);

  // Deduplicate sources
  const allSources = collectAllSources(problemEvidence, competitorAnalysis, marketSignals);

  return { problemEvidence, competitorAnalysis, marketSignals, synthesis, allSources };
}
