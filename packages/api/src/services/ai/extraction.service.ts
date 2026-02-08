import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import prisma, { ElementType, ProjectStatus, type Prisma } from "@val/db";
import { Logger } from "../../shared/logger";
import { generateQuestions } from "./question-generation.service";
import { EXTRACTION_PROMPT } from "./extraction.prompts";

const logger = new Logger({ service: "extraction" });

const ElementExtractionSchema = z.object({
  title: z
    .string()
    .max(80)
    .describe(
      "A concise, descriptive project title (3-8 words) that captures the core idea. Not a tagline or slogan — just a clear name for the project."
    ),
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


export async function extractProjectElements(projectId: string, rawBraindump: string): Promise<void> {
  logger.info("Starting extraction", { projectId });

  try {
    const { object: extraction } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: ElementExtractionSchema,
      prompt: EXTRACTION_PROMPT.replace("{braindump}", rawBraindump),
    });

    const { title, ...extractedElements } = extraction;

    const elementTypeMap: Record<keyof typeof extractedElements, ElementType> = {
      who: ElementType.who,
      problem: ElementType.problem,
      solution: ElementType.solution,
      differentiation: ElementType.differentiation,
      monetization: ElementType.monetization,
    };

    const elements: Prisma.ProjectElementCreateManyInput[] = Object.entries(extractedElements).map(
      ([key, data]) => ({
        projectId,
        elementType: elementTypeMap[key as keyof typeof extractedElements],
        statedValue: data.value,
        clarityScore: data.clarityScore,
        missingInfo: data.missingInfo,
        extractedBy: "ai",
        extractionConfidence: data.confidence,
      })
    );

    await prisma.projectElement.createMany({
      data: elements,
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.structured, title },
    });

    logger.info("Extraction complete", { projectId, elementsCreated: elements.length });

    // Fetch the created elements with proper types for question generation
    const createdElements = await prisma.projectElement.findMany({
      where: { projectId, isCurrent: true },
    });

    // Generate questions based on extracted elements
    const generatedQuestions = await generateQuestions(
      { id: projectId, rawBraindump, elements: createdElements },
      createdElements
    );

    // Create questions in database
    await prisma.question.createMany({
      data: generatedQuestions.map((q, index) => ({
        projectId,
        questionText: q.questionText,
        level: q.level,
        category: q.category,
        whyAsking: q.whyAsking,
        exampleAnswer: q.exampleAnswer,
        isCritical: q.isCritical,
        canSkip: q.canSkip,
        answerFormat: q.answerFormat,
        answerOptions: q.answerOptions,
        displayOrder: index,
      })),
    });

    logger.info("Questions generated", { projectId, count: generatedQuestions.length });
  } catch (error) {
    logger.error("Extraction failed", error instanceof Error ? error : undefined, { projectId });
    throw error;
  }
}
