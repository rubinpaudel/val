import { z } from "zod";

const MAX_BRAINDUMP_LENGTH = 5000;

export const createProjectSchema = z.object({
  rawBraindump: z
    .string()
    .min(1, "Project cannot be empty")
    .max(MAX_BRAINDUMP_LENGTH, `Project cannot exceed ${MAX_BRAINDUMP_LENGTH} characters`),
  title: z.string().max(100).optional(),
});

export const getProjectByIdSchema = z.object({
  id: z.string().cuid(),
});

export const updateProjectSchema = z.object({
  id: z.string().cuid(),
  rawBraindump: z
    .string()
    .min(1, "Project cannot be empty")
    .max(MAX_BRAINDUMP_LENGTH, `Project cannot exceed ${MAX_BRAINDUMP_LENGTH} characters`)
    .optional(),
  title: z.string().max(100).optional(),
});

export const deleteProjectSchema = z.object({
  id: z.string().cuid(),
});

export const listProjectsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().cuid().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
