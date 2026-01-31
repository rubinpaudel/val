import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../index";
import { AppError } from "../../shared/errors/base.error";
import { ideaService } from "./idea.service";
import {
  createIdeaSchema,
  getIdeaByIdSchema,
  updateIdeaSchema,
  deleteIdeaSchema,
  listIdeasSchema,
} from "./idea.schema";

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

export const ideaRouter = router({
  create: protectedProcedure.input(createIdeaSchema).mutation(async ({ ctx, input }) => {
    try {
      return await ideaService.create(ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  getById: protectedProcedure.input(getIdeaByIdSchema).query(async ({ ctx, input }) => {
    try {
      return await ideaService.getById(input.id, ctx.session.user.id);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  list: protectedProcedure.input(listIdeasSchema).query(async ({ ctx, input }) => {
    try {
      return await ideaService.list(ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  update: protectedProcedure.input(updateIdeaSchema).mutation(async ({ ctx, input }) => {
    try {
      const { id } = input;
      return await ideaService.update(id, ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  delete: protectedProcedure.input(deleteIdeaSchema).mutation(async ({ ctx, input }) => {
    try {
      await ideaService.delete(input.id, ctx.session.user.id);
      return { success: true };
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
});
