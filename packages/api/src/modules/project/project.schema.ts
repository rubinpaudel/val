import { z } from "zod";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

export const createProjectSchema = z.object({
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must not exceed 5000 characters")
    .transform(normalizeWhitespace)
    .refine((val) => val.length >= 10, {
      message: "Description must be at least 10 characters after normalization",
    }),
});

export const getProjectByIdSchema = z.object({
  id: z.string().cuid("Invalid project ID format"),
});

export const deleteProjectSchema = z.object({
  id: z.string().cuid("Invalid project ID format"),
});

export const listProjectsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE)
    .optional(),
  cursor: z.string().cuid("Invalid cursor format").optional(),
});

export type CreateProjectSchemaInput = z.infer<typeof createProjectSchema>;
export type GetProjectByIdSchemaInput = z.infer<typeof getProjectByIdSchema>;
export type DeleteProjectSchemaInput = z.infer<typeof deleteProjectSchema>;
export type ListProjectsSchemaInput = z.infer<typeof listProjectsSchema>;
