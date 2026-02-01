import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { QuestionLevel, type ElementType } from "@val/db";
import { Logger } from "../../shared/logger";

const logger = new Logger({ service: "question-generation" });

interface IdeaElement {
  elementType: ElementType;
  statedValue: string | null;
  clarityScore: { toNumber(): number } | null;
  missingInfo: unknown;
}

interface IdeaWithElements {
  id: string;
  rawBraindump: string;
  elements: IdeaElement[];
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

const QUESTION_GENERATION_PROMPT = `You are Val, an expert startup validation assistant. Based on the user's braindump and the extracted elements, generate 3-5 clarifying questions that will help with validation research.

Guidelines:
1. Focus on gaps identified in missingInfo for each element
2. Ask about specifics: numbers, timelines, experiences
3. Prioritize questions that uncover whether this is a real problem people will pay to solve
4. Use Bloom's taxonomy levels appropriately:
   - REMEMBER: For basic facts (e.g., "How many hours do you spend on X?")
   - UNDERSTAND: For explaining (e.g., "Why do you think customers struggle with X?")
   - APPLY: For practical scenarios (e.g., "How would your customers use this?")
   - ANALYZE: For comparisons (e.g., "How does this compare to what you're using now?")
   - EVALUATE: For judgment (e.g., "What would make this solution worth paying for?")
   - CREATE: For ideation (e.g., "What features would be essential for launch?")

5. Mark questions as critical if skipping them would significantly harm validation quality
6. Most questions should be skippable, but provide fair warning

Original Braindump:
{braindump}

Extracted Elements:
{elements}

Generate questions that will fill the most important gaps for validation research.`;

function formatElements(elements: IdeaElement[]): string {
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
  REMEMBER: QuestionLevel.REMEMBER,
  UNDERSTAND: QuestionLevel.UNDERSTAND,
  APPLY: QuestionLevel.APPLY,
  ANALYZE: QuestionLevel.ANALYZE,
  EVALUATE: QuestionLevel.EVALUATE,
  CREATE: QuestionLevel.CREATE,
};

function mapLevel(level: string): QuestionLevel {
  return levelMap[level] ?? QuestionLevel.UNDERSTAND;
}

export async function generateQuestions(
  idea: IdeaWithElements,
  elements: IdeaElement[]
): Promise<QuestionGenerationResult[]> {
  logger.info("Generating questions", { ideaId: idea.id });

  try {
    const prompt = QUESTION_GENERATION_PROMPT.replace("{braindump}", idea.rawBraindump).replace(
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
      ideaId: idea.id,
      count: questions.length,
      criticalCount: questions.filter((q) => q.isCritical).length,
    });

    return questions;
  } catch (error) {
    logger.error("Question generation failed", error instanceof Error ? error : undefined, {
      ideaId: idea.id,
    });
    throw error;
  }
}
