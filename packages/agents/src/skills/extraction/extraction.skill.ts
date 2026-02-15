import { generateObject } from "ai";
import prisma, { ElementType, ProjectStatus, type Prisma } from "@val/db";
import { getTracedModel } from "../../core/model";
import { Logger } from "../../core/logger";
import { generateQuestions } from "../question-generation/question-generation.skill";
import { loadSkill } from "../skill-registry";
import { ElementExtractionSchema, ALLOWED_ICONS, DEFAULT_ICON } from "./extraction.schema";
import type { PostHog } from "posthog-node";

const logger = new Logger({ service: "extraction" });

export async function extractProjectElements(
  projectId: string,
  rawBraindump: string,
  userId: string,
  posthogClient?: PostHog | null,
): Promise<void> {
  logger.info("Starting extraction", { projectId });

  try {
    const { object: extraction } = await generateObject({
      model: getTracedModel(posthogClient, { posthogDistinctId: userId, posthogProperties: { projectId, type: "extraction" } }),
      schema: ElementExtractionSchema,
      prompt: loadSkill("extraction").instructions.replace("{braindump}", rawBraindump),
    });

    const { title, icon: rawIcon, ...extractedElements } = extraction;
    const icon = ALLOWED_ICONS.has(rawIcon) ? rawIcon : DEFAULT_ICON;

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

    logger.info("Elements created", { projectId, elementsCreated: elements.length });

    // Fetch the created elements with proper types for question generation
    const createdElements = await prisma.projectElement.findMany({
      where: { projectId, isCurrent: true },
    });

    // Generate questions based on extracted elements
    const generatedQuestions = await generateQuestions(
      { id: projectId, rawBraindump, elements: createdElements },
      createdElements,
      { userId, projectId },
      posthogClient,
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

    // Update status last so the frontend only sees "structured" when everything is ready
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.structured, title, icon },
    });
  } catch (error) {
    logger.error("Extraction failed", error instanceof Error ? error : undefined, { projectId });
    throw error;
  }
}
