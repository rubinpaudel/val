import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../index";
import { AppError } from "../../shared/errors/base.error";
import type { ILogger } from "../../shared/logger";
import type { IProjectService } from "./project.service";
import {
  createProjectSchema,
  getProjectByIdSchema,
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

function toTRPCError(error: unknown, logger: ILogger): TRPCError {
  if (error instanceof AppError) {
    return new TRPCError({
      code: errorCodeMap[error.code] || "INTERNAL_SERVER_ERROR",
      message: error.message,
      cause: error,
    });
  }

  logger.error(
    "Unexpected error",
    error instanceof Error ? error : undefined,
    { errorType: typeof error }
  );

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}

export function createProjectController(
  projectService: IProjectService,
  logger: ILogger
) {
  return router({
    list: protectedProcedure
      .input(listProjectsSchema)
      .query(async ({ ctx, input }) => {
        try {
          const userId = ctx.session.user.id;
          logger.debug("Listing projects", { userId, ...input });

          return await projectService.getProjectsByUserId(userId, input);
        } catch (error) {
          throw toTRPCError(error, logger);
        }
      }),

    getById: protectedProcedure
      .input(getProjectByIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          const userId = ctx.session.user.id;
          logger.debug("Getting project by id", {
            projectId: input.id,
            userId,
          });

          return await projectService.getProjectById(input.id, userId);
        } catch (error) {
          throw toTRPCError(error, logger);
        }
      }),

    create: protectedProcedure
      .input(createProjectSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const userId = ctx.session.user.id;
          logger.debug("Creating project", { userId });

          return await projectService.createProject({
            userId,
            description: input.description,
          });
        } catch (error) {
          throw toTRPCError(error, logger);
        }
      }),

    delete: protectedProcedure
      .input(deleteProjectSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const userId = ctx.session.user.id;
          logger.debug("Deleting project", {
            projectId: input.id,
            userId,
          });

          await projectService.deleteProject(input.id, userId);

          return { success: true };
        } catch (error) {
          throw toTRPCError(error, logger);
        }
      }),
  });
}

export type ProjectController = ReturnType<typeof createProjectController>;
