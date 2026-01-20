import { z } from "zod";

export const createProjectSchema = z.object({
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must not exceed 5000 characters")
    .trim(),
});

export const getProjectByIdSchema = z.object({
  id: z.string().cuid("Invalid project ID format"),
});

export const deleteProjectSchema = z.object({
  id: z.string().cuid("Invalid project ID format"),
});

export type CreateProjectSchemaInput = z.infer<typeof createProjectSchema>;
export type GetProjectByIdSchemaInput = z.infer<typeof getProjectByIdSchema>;
export type DeleteProjectSchemaInput = z.infer<typeof deleteProjectSchema>;
