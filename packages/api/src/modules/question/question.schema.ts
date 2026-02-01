import { z } from "zod";

const MAX_ANSWER_LENGTH = 5000;
const MAX_SKIP_REASON_LENGTH = 500;

export const generateQuestionsSchema = z.object({
  ideaId: z.string().cuid(),
});

export const listQuestionsSchema = z.object({
  ideaId: z.string().cuid(),
  includeAnswered: z.boolean().default(false),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().cuid(),
  answerText: z.string().max(MAX_ANSWER_LENGTH).optional(),
  answerData: z.record(z.string(), z.unknown()).optional(),
});

export const skipQuestionSchema = z.object({
  questionId: z.string().cuid(),
  skipReason: z.string().max(MAX_SKIP_REASON_LENGTH).optional(),
});

export const bulkSubmitAnswersSchema = z.object({
  ideaId: z.string().cuid(),
  answers: z.array(
    z.object({
      questionId: z.string().cuid(),
      answerText: z.string().max(MAX_ANSWER_LENGTH).optional(),
      answerData: z.record(z.string(), z.unknown()).optional(),
      skipped: z.boolean().default(false),
      skipReason: z.string().max(MAX_SKIP_REASON_LENGTH).optional(),
    })
  ),
});

export type GenerateQuestionsInput = z.infer<typeof generateQuestionsSchema>;
export type ListQuestionsInput = z.infer<typeof listQuestionsSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type SkipQuestionInput = z.infer<typeof skipQuestionSchema>;
export type BulkSubmitAnswersInput = z.infer<typeof bulkSubmitAnswersSchema>;
