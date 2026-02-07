import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../index";
import { AppError } from "../../shared/errors/base.error";
import { chatService } from "./chat.service";
import {
  createChatSchema,
  getChatByIdSchema,
  getChatMessagesSchema,
  listChatsByProjectSchema,
  deleteChatSchema,
} from "./chat.schema";

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

export const chatRouter = router({
  create: protectedProcedure.input(createChatSchema).mutation(async ({ ctx, input }) => {
    try {
      return await chatService.create(ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  getById: protectedProcedure.input(getChatByIdSchema).query(async ({ ctx, input }) => {
    try {
      return await chatService.getById(input.chatId, ctx.session.user.id);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  getMessages: protectedProcedure.input(getChatMessagesSchema).query(async ({ ctx, input }) => {
    try {
      return await chatService.getMessages(input.chatId, ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  listByProject: protectedProcedure.input(listChatsByProjectSchema).query(async ({ ctx, input }) => {
    try {
      return await chatService.listByProject(ctx.session.user.id, input);
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  delete: protectedProcedure.input(deleteChatSchema).mutation(async ({ ctx, input }) => {
    try {
      await chatService.delete(input.chatId, ctx.session.user.id);
      return { success: true };
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
});
