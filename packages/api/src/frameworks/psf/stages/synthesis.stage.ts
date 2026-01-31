import type { IResearchStage, StageContext, StageResult } from "../../base";
import { generateStructuredOutput } from "../../../agents/ai.client";
import { buildReportSynthesisPrompt } from "../prompts";
import { psfSynthesisSchema, type PSFSynthesis, type SectionResearchData } from "../psf.schema";

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

export class SynthesisStage implements IResearchStage<PSFSynthesis> {
  readonly id = "synthesis";
  readonly name = "Synthesizing final report";
  readonly weight = 25;
  readonly dependencies = ["problem-evidence", "competitor-analysis", "market-signals"];

  async execute(context: StageContext): Promise<StageResult<PSFSynthesis>> {
    // Get results from previous stages
    const problemEvidence = context.previousResults.get("problem-evidence") as SectionResearchData | undefined;
    const competitorAnalysis = context.previousResults.get("competitor-analysis") as SectionResearchData | undefined;
    const marketSignals = context.previousResults.get("market-signals") as SectionResearchData | undefined;

    if (!problemEvidence || !competitorAnalysis || !marketSignals) {
      throw new Error("Missing required stage results for synthesis");
    }

    const prompt = buildReportSynthesisPrompt(
      {
        projectDescription: context.projectDescription,
        tasks: context.tasks,
      },
      problemEvidence.content,
      competitorAnalysis.content,
      marketSignals.content
    );

    try {
      const synthesis = await generateStructuredOutput(prompt, psfSynthesisSchema);

      return {
        data: synthesis,
        sources: [],
        searchQueries: [],
      };
    } catch (error) {
      context.logger.error("Failed to generate synthesis, using fallback", error as Error);

      return {
        data: FALLBACK_SYNTHESIS,
        sources: [],
        searchQueries: [],
      };
    }
  }
}
