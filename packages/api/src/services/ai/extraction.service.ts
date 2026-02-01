import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import prisma, { ElementType, IdeaStatus, type Prisma } from "@val/db";
import { Logger } from "../../shared/logger";

const logger = new Logger({ service: "extraction" });

const ElementExtractionSchema = z.object({
  who: z.object({
    value: z.string().nullable().describe("The target audience/customer segment. Null if not mentioned."),
    clarityScore: z.number().min(0).max(10).describe("How clearly defined is this element (0-10)"),
    missingInfo: z.array(z.string()).describe("What information is missing or vague"),
    confidence: z.number().min(0).max(1).describe("AI confidence in this extraction (0-1)"),
  }),
  problem: z.object({
    value: z.string().nullable().describe("The problem being solved. Null if not mentioned."),
    clarityScore: z.number().min(0).max(10).describe("How clearly defined is this element (0-10)"),
    missingInfo: z.array(z.string()).describe("What information is missing or vague"),
    confidence: z.number().min(0).max(1).describe("AI confidence in this extraction (0-1)"),
  }),
  solution: z.object({
    value: z.string().nullable().describe("The proposed solution. Null if not mentioned."),
    clarityScore: z.number().min(0).max(10).describe("How clearly defined is this element (0-10)"),
    missingInfo: z.array(z.string()).describe("What information is missing or vague"),
    confidence: z.number().min(0).max(1).describe("AI confidence in this extraction (0-1)"),
  }),
  differentiation: z.object({
    value: z.string().nullable().describe("What makes this different from alternatives. Null if not mentioned."),
    clarityScore: z.number().min(0).max(10).describe("How clearly defined is this element (0-10)"),
    missingInfo: z.array(z.string()).describe("What information is missing or vague"),
    confidence: z.number().min(0).max(1).describe("AI confidence in this extraction (0-1)"),
  }),
  monetization: z.object({
    value: z.string().nullable().describe("How this will make money. Null if not mentioned."),
    clarityScore: z.number().min(0).max(10).describe("How clearly defined is this element (0-10)"),
    missingInfo: z.array(z.string()).describe("What information is missing or vague"),
    confidence: z.number().min(0).max(1).describe("AI confidence in this extraction (0-1)"),
  }),
});

type ExtractionResult = z.infer<typeof ElementExtractionSchema>;

const EXTRACTION_PROMPT = `You are an expert startup analyst. Analyze this startup idea braindump and extract the 5 core elements.

Be strict but fair in your scoring:
- Score 0-3: Very vague or not mentioned at all
- Score 4-6: Mentioned but lacks important details
- Score 7-8: Well defined with minor gaps
- Score 9-10: Crystal clear and specific

For "missingInfo", list specific questions that would help clarify this element.

If an element is not mentioned at all, set value to null and clarityScore to 0.

Startup Idea:
{braindump}`;

export async function extractIdeaElements(ideaId: string, rawBraindump: string): Promise<void> {
  logger.info("Starting extraction", { ideaId });

  try {
    const { object: extraction } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: ElementExtractionSchema,
      prompt: EXTRACTION_PROMPT.replace("{braindump}", rawBraindump),
    });

    const elementTypeMap: Record<keyof ExtractionResult, ElementType> = {
      who: ElementType.who,
      problem: ElementType.problem,
      solution: ElementType.solution,
      differentiation: ElementType.differentiation,
      monetization: ElementType.monetization,
    };

    const elements: Prisma.IdeaElementCreateManyInput[] = Object.entries(extraction).map(
      ([key, data]) => ({
        ideaId,
        elementType: elementTypeMap[key as keyof ExtractionResult],
        statedValue: data.value,
        clarityScore: data.clarityScore,
        missingInfo: data.missingInfo,
        extractedBy: "ai",
        extractionConfidence: data.confidence,
      })
    );

    await prisma.ideaElement.createMany({
      data: elements,
    });

    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: IdeaStatus.structured },
    });

    logger.info("Extraction complete", { ideaId, elementsCreated: elements.length });
  } catch (error) {
    logger.error("Extraction failed", error instanceof Error ? error : undefined, { ideaId });
    throw error;
  }
}
