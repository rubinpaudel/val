import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../index";
import { AppError } from "../../shared/errors/base.error";
import { projectService } from "./project.service";
import {
  createProjectSchema,
  getProjectByIdSchema,
  updateProjectSchema,
  deleteProjectSchema,
  listProjectsSchema,
} from "./project.schema";

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

export const projectRouter = router({
  create: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    try {
      return await projectService.create(ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  getById: protectedProcedure.input(getProjectByIdSchema).query(async ({ ctx, input }) => {
    try {
      return await projectService.getById(input.id, ctx.session.user.id);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  list: protectedProcedure.input(listProjectsSchema).query(async ({ ctx, input }) => {
    try {
      return await projectService.list(ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  update: protectedProcedure.input(updateProjectSchema).mutation(async ({ ctx, input }) => {
    try {
      const { id } = input;
      return await projectService.update(id, ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  delete: protectedProcedure.input(deleteProjectSchema).mutation(async ({ ctx, input }) => {
    try {
      await projectService.delete(input.id, ctx.session.user.id);
      return { success: true };
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
});
