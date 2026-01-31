import type { IResearchStage, StageContext, StageResult } from "../../base";
import { generateWithGrounding } from "../../../agents/ai.client";
import { buildProblemEvidencePrompt } from "../prompts";
import type { SectionResearchData } from "../psf.schema";

export class ProblemEvidenceStage implements IResearchStage<SectionResearchData> {
  readonly id = "problem-evidence";
  readonly name = "Researching problem evidence";
  readonly weight = 30;
  readonly dependencies: string[] = [];

  async execute(context: StageContext): Promise<StageResult<SectionResearchData>> {
    const prompt = buildProblemEvidencePrompt({
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
