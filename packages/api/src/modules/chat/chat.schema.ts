import { z } from "zod";

export const createChatSchema = z.object({
  projectId: z.string().cuid().optional(),
  title: z.string().max(100).optional(),
});

export const getChatByIdSchema = z.object({
  chatId: z.string().cuid(),
});

export const getChatMessagesSchema = z.object({
  chatId: z.string().cuid(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().cuid().optional(),
});

export const listChatsByProjectSchema = z.object({
  projectId: z.string().cuid(),
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().cuid().optional(),
});

export const deleteChatSchema = z.object({
  chatId: z.string().cuid(),
});

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type GetChatMessagesInput = z.infer<typeof getChatMessagesSchema>;
export type ListChatsByProjectInput = z.infer<typeof listChatsByProjectSchema>;
