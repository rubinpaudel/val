import type { IResearchStage, StageContext, StageResult } from "../../base";
import { generateWithGrounding } from "../../../agents/ai.client";
import { buildCompetitorAnalysisPrompt } from "../prompts";
import type { SectionResearchData } from "../psf.schema";

export class CompetitorAnalysisStage implements IResearchStage<SectionResearchData> {
  readonly id = "competitor-analysis";
  readonly name = "Analyzing competitors";
  readonly weight = 25;
  readonly dependencies: string[] = [];

  async execute(context: StageContext): Promise<StageResult<SectionResearchData>> {
    const prompt = buildCompetitorAnalysisPrompt({
      projectDescription: context.projectDescription,
      tasks: context.tasks,
    });

    const result = await generateWithGrounding(prompt);

    const data: SectionResearchData = {
      content: result.content,
      sources: result.sources,
      searchQueries: result.searchQueries,
    };

    return {
      data,
      sources: result.sources,
      searchQueries: result.searchQueries,
    };
  }
}
