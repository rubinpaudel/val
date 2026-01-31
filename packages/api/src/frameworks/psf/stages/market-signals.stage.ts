import type { IResearchStage, StageContext, StageResult } from "../../base";
import { generateWithGrounding } from "../../../agents/ai.client";
import { buildMarketSignalsPrompt } from "../prompts";
import type { SectionResearchData } from "../psf.schema";

export class MarketSignalsStage implements IResearchStage<SectionResearchData> {
  readonly id = "market-signals";
  readonly name = "Researching market signals";
  readonly weight = 20;
  readonly dependencies: string[] = [];

  async execute(context: StageContext): Promise<StageResult<SectionResearchData>> {
    const prompt = buildMarketSignalsPrompt({
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
