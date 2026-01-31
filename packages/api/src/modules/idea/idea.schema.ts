import { z } from "zod";

const MAX_BRAINDUMP_LENGTH = 5000;

export const createIdeaSchema = z.object({
  rawBraindump: z
    .string()
    .min(1, "Idea cannot be empty")
    .max(MAX_BRAINDUMP_LENGTH, `Idea cannot exceed ${MAX_BRAINDUMP_LENGTH} characters`),
  title: z.string().max(100).optional(),
});

export const getIdeaByIdSchema = z.object({
  id: z.string().cuid(),
});

export const updateIdeaSchema = z.object({
  id: z.string().cuid(),
  rawBraindump: z
    .string()
    .min(1, "Idea cannot be empty")
    .max(MAX_BRAINDUMP_LENGTH, `Idea cannot exceed ${MAX_BRAINDUMP_LENGTH} characters`)
    .optional(),
  title: z.string().max(100).optional(),
});

export const deleteIdeaSchema = z.object({
  id: z.string().cuid(),
});

export const listIdeasSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().cuid().optional(),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;
export type ListIdeasInput = z.infer<typeof listIdeasSchema>;
