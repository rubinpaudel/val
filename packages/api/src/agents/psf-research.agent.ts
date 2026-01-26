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

export interface SectionAnalysis {
  score: number;
  keyFindings: string[];
  concerns: string[];
}

// Re-export PSFSynthesis for external use
export type { PSFSynthesis };

// Build research context from framework data
export function buildResearchContext(
  projectDescription: string,
  tasks: ValidationTask[]
): ResearchContext {
  return {
    projectDescription,
    tasks,
  };
}

// Conduct problem evidence research
export async function conductProblemResearch(
  context: ResearchContext
): Promise<SectionResearch> {
  const prompt = buildProblemEvidencePrompt(context);
  const result = await generateWithGrounding(prompt);

  return {
    content: result.content,
    sources: result.sources,
    searchQueries: result.searchQueries,
  };
}

// Conduct competitor analysis research
export async function conductCompetitorResearch(
  context: ResearchContext
): Promise<SectionResearch> {
  const prompt = buildCompetitorAnalysisPrompt(context);
  const result = await generateWithGrounding(prompt);

  return {
    content: result.content,
    sources: result.sources,
    searchQueries: result.searchQueries,
  };
}

// Conduct market signals research
export async function conductMarketResearch(
  context: ResearchContext
): Promise<SectionResearch> {
  const prompt = buildMarketSignalsPrompt(context);
  const result = await generateWithGrounding(prompt);

  return {
    content: result.content,
    sources: result.sources,
    searchQueries: result.searchQueries,
  };
}

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
    // Use structured output for guaranteed schema compliance
    const synthesis = await generateStructuredOutput(
      prompt,
      psfSynthesisSchema
    );

    return synthesis;
  } catch (error) {
    console.error("Failed to generate synthesis:", error);

    // Return a fallback synthesis
    return {
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
  }
}

// Normalize URL for deduplication
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash from path
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    // Sort query parameters for consistent comparison
    const params = Array.from(parsed.searchParams.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    parsed.search = params.length
      ? "?" + params.map(([k, v]) => `${k}=${v}`).join("&")
      : "";
    // Remove fragment
    parsed.hash = "";
    // Lowercase hostname
    return parsed.toString().toLowerCase();
  } catch {
    // If URL parsing fails, return original lowercased
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
  const context = buildResearchContext(projectDescription, tasks);

  // Step 1: Problem Evidence Research (0-30%)
  await onProgress?.("Researching problem evidence...", 10);
  const problemEvidence = await conductProblemResearch(context);
  await onProgress?.("Problem evidence research complete", 30);

  // Step 2: Competitor Analysis (30-60%)
  await onProgress?.("Analyzing competitors...", 35);
  const competitorAnalysis = await conductCompetitorResearch(context);
  await onProgress?.("Competitor analysis complete", 60);

  // Step 3: Market Signals (60-80%)
  await onProgress?.("Researching market signals...", 65);
  const marketSignals = await conductMarketResearch(context);
  await onProgress?.("Market signals research complete", 80);

  // Step 4: Synthesize Report (80-100%)
  await onProgress?.("Synthesizing final report...", 85);
  const synthesis = await synthesizeReport(
    context,
    problemEvidence,
    competitorAnalysis,
    marketSignals
  );
  await onProgress?.("Report synthesis complete", 100);

  // Collect all sources
  const allSources = collectAllSources(
    problemEvidence,
    competitorAnalysis,
    marketSignals
  );

  return {
    problemEvidence,
    competitorAnalysis,
    marketSignals,
    synthesis,
    allSources,
  };
}
