import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../index";
import { AppError } from "../../shared/errors/base.error";
import { researchService } from "./research.service";
import {
  startResearchSchema,
  getResearchStatusSchema,
  cancelResearchJobSchema,
  getResearchResultsSchema,
} from "./research.schema";

const errorCodeMap: Record<string, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RESEARCH_IN_PROGRESS: "CONFLICT",
  RESEARCH_COMPLETED: "CONFLICT",
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

export const researchRouter = router({
  start: protectedProcedure
    .input(startResearchSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await researchService.startResearch(
          ctx.session.user.id,
          input,
          ctx.queueResearchJob,
        );
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  getStatus: protectedProcedure
    .input(getResearchStatusSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await researchService.getStatus(ctx.session.user.id, input);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  cancel: protectedProcedure
    .input(cancelResearchJobSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await researchService.cancel(ctx.session.user.id, input);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  getResults: protectedProcedure
    .input(getResearchResultsSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await researchService.getResults(ctx.session.user.id, input);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
