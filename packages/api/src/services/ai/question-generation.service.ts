import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { QuestionLevel, type ElementType } from "@val/db";
import { Logger } from "../../shared/logger";
import { QUESTION_GENERATION_PROMPT } from "./question-generation.prompts";

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

const QuestionGenerationSchema = z.object({
  questions: z
    .array(
      z.object({
        questionText: z.string().describe("The question to ask the user"),
        level: z
          .enum(["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"])
          .describe("Bloom's taxonomy level of the question"),
        category: z
          .enum(["WHO", "PROBLEM", "SOLUTION", "DIFFERENTIATION", "MONETIZATION", "GENERAL"])
          .describe("Which element this question relates to"),
        whyAsking: z
          .string()
          .describe("Brief explanation of why this question matters for validation"),
        exampleAnswer: z
          .string()
          .nullable()
          .describe("An example of a good answer, if helpful"),
        isCritical: z
          .boolean()
          .describe("Whether this question is critical for proper validation"),
        canSkip: z.boolean().describe("Whether the user can skip this question"),
        answerFormat: z
          .enum(["text", "single_select", "multi_select", "scale", "yes_no"])
          .default("text"),
        answerOptions: z
          .array(z.string())
          .default([])
          .describe("Options for select questions"),
      })
    )
    .min(3)
    .max(5),
});

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
  elements: ProjectElement[]
): Promise<QuestionGenerationResult[]> {
  logger.info("Generating questions", { projectId: project.id });

  try {
    const prompt = QUESTION_GENERATION_PROMPT.replace("{braindump}", project.rawBraindump).replace(
      "{elements}",
      formatElements(elements)
    );

    const { object: result } = await generateObject({
      model: google("gemini-2.0-flash"),
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
