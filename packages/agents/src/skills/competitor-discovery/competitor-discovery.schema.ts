import { z } from "zod";

export const CompetitorDiscoverySchema = z.object({
  competitors: z
    .array(
      z.object({
        name: z.string().describe("Company or product name"),
        url: z.string().describe("Primary website URL"),
        oneLiner: z
          .string()
          .describe("One-line description of what they do"),
        whyCompetitor: z
          .string()
          .describe("Why this is a competitor to the project"),
      }),
    )
    .min(1)
    .max(7),
});

export type CompetitorDiscovery = z.infer<typeof CompetitorDiscoverySchema>;
