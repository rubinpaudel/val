import { z } from "zod";

export const startResearchSchema = z.object({
  projectId: z.string(),
});

export const getResearchStatusSchema = z.object({
  projectId: z.string(),
});

export const cancelResearchJobSchema = z.object({
  jobId: z.string(),
});

export const getResearchResultsSchema = z.object({
  projectId: z.string(),
  resultType: z.string().optional(),
});

export type StartResearchInput = z.infer<typeof startResearchSchema>;
export type GetResearchStatusInput = z.infer<typeof getResearchStatusSchema>;
export type CancelResearchJobInput = z.infer<typeof cancelResearchJobSchema>;
export type GetResearchResultsInput = z.infer<typeof getResearchResultsSchema>;
