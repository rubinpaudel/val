import { generateObject } from "ai";
import { QuestionLevel, type ElementType } from "@val/db";
import { getTracedModel } from "../../core/model";
import { Logger } from "../../core/logger";
import { loadSkill } from "../skill-registry";
import { QuestionGenerationSchema } from "./question-generation.schema";
import type { PostHog } from "posthog-node";
import type { z } from "zod";

const logger = new Logger({ service: "question-generation" });

interface ProjectElement {
  elementType: ElementType;
  statedValue: string | null;
  clarityScore: { toNumber(): number } | null;
  missingInfo: unknown;
}

interface ProjectWithElements {
  id: string;
  rawBraindump: string;
  elements: ProjectElement[];
}

type GeneratedQuestion = z.infer<typeof QuestionGenerationSchema>["questions"][0];

export interface QuestionGenerationResult {
  questionText: string;
  level: QuestionLevel;
  category: string;
  whyAsking: string;
  exampleAnswer: string | null;
  isCritical: boolean;
  canSkip: boolean;
  answerFormat: string;
  answerOptions: string[];
}

function formatElements(elements: ProjectElement[]): string {
  return elements
    .map((el) => {
      const missingInfo = Array.isArray(el.missingInfo)
        ? (el.missingInfo as string[]).join(", ")
        : "None identified";
      return `- ${el.elementType}: "${el.statedValue || "Not mentioned"}" (Clarity: ${el.clarityScore?.toNumber() ?? 0}/10, Missing: ${missingInfo})`;
    })
    .join("\n");
}

const levelMap: Record<string, QuestionLevel> = {
  REMEMBER: QuestionLevel.remember,
  UNDERSTAND: QuestionLevel.understand,
  APPLY: QuestionLevel.apply,
  ANALYZE: QuestionLevel.analyze,
  EVALUATE: QuestionLevel.evaluate,
  CREATE: QuestionLevel.create,
};

function mapLevel(level: string): QuestionLevel {
  return levelMap[level] ?? QuestionLevel.understand;
}

export async function generateQuestions(
  project: ProjectWithElements,
  elements: ProjectElement[],
  traceContext?: { userId: string; projectId: string },
  posthogClient?: PostHog | null,
): Promise<QuestionGenerationResult[]> {
  logger.info("Generating questions", { projectId: project.id });

  try {
    const prompt = loadSkill("question-generation").instructions
      .replace("{braindump}", project.rawBraindump)
      .replace("{elements}", formatElements(elements));

    const model = traceContext
      ? getTracedModel(posthogClient, {
          posthogDistinctId: traceContext.userId,
          posthogProperties: { projectId: traceContext.projectId, type: "question-generation" },
        })
      : getTracedModel();

    const { object: result } = await generateObject({
      model,
      schema: QuestionGenerationSchema,
      prompt,
    });

    const questions: QuestionGenerationResult[] = result.questions.map(
      (q: GeneratedQuestion) => ({
        questionText: q.questionText,
        level: mapLevel(q.level),
        category: q.category,
        whyAsking: q.whyAsking,
        exampleAnswer: q.exampleAnswer,
        isCritical: q.isCritical,
        canSkip: q.canSkip,
        answerFormat: q.answerFormat,
        answerOptions: q.answerOptions,
      })
    );

    logger.info("Questions generated", {
      projectId: project.id,
      count: questions.length,
      criticalCount: questions.filter((q) => q.isCritical).length,
    });

    return questions;
  } catch (error) {
    logger.error("Question generation failed", error instanceof Error ? error : undefined, {
      projectId: project.id,
    });
    throw error;
  }
}
