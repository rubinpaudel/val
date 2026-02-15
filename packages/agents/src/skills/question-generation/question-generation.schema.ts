import { z } from "zod";

export const QuestionGenerationSchema = z.object({
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
