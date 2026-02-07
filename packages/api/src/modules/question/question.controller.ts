import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../index";
import { AppError } from "../../shared/errors/base.error";
import { questionService } from "./question.service";
import {
  generateQuestionsSchema,
  listQuestionsSchema,
  submitAnswerSchema,
  skipQuestionSchema,
  bulkSubmitAnswersSchema,
} from "./question.schema";

const errorCodeMap: Record<string, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
};

function toTRPCError(error: unknown): TRPCError {
  if (error instanceof AppError) {
    return new TRPCError({
      code: errorCodeMap[error.code] || "INTERNAL_SERVER_ERROR",
      message: error.message,
      cause: error,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}

export const questionRouter = router({
  generate: protectedProcedure.input(generateQuestionsSchema).mutation(async ({ ctx, input }) => {
    try {
      return await questionService.generateForProject(input.projectId, ctx.session.user.id);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  list: protectedProcedure.input(listQuestionsSchema).query(async ({ ctx, input }) => {
    try {
      return await questionService.listForProject(input.projectId, ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  submitAnswer: protectedProcedure.input(submitAnswerSchema).mutation(async ({ ctx, input }) => {
    try {
      return await questionService.submitAnswer(ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  skip: protectedProcedure.input(skipQuestionSchema).mutation(async ({ ctx, input }) => {
    try {
      return await questionService.skipQuestion(ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  bulkSubmit: protectedProcedure.input(bulkSubmitAnswersSchema).mutation(async ({ ctx, input }) => {
    try {
      return await questionService.bulkSubmitAnswers(ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
});
