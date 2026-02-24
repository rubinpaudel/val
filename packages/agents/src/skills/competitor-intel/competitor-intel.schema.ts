import { z } from "zod";

const PricingTierSchema = z.object({
  name: z.string(),
  price: z.string(),
  features: z.array(z.string()),
});

export const CompetitorProfileSchema = z.object({
  companyOverview: z.object({
    foundedYear: z.number().nullable(),
    headquarters: z.string().nullable(),
    teamSize: z.string().nullable(),
    totalFunding: z.string().nullable(),
    keyPeople: z.array(z.string()),
    description: z.string(),
  }),
  product: z.object({
    coreFeatures: z.array(z.string()),
    targetAudience: z.string(),
    pricingModel: z.string().nullable(),
    pricingTiers: z.array(PricingTierSchema),
    platforms: z.array(z.string()),
  }),
  traction: z.object({
    estimatedUsers: z.string().nullable(),
    estimatedRevenue: z.string().nullable(),
    notableCustomers: z.array(z.string()),
    appStoreRating: z.number().nullable(),
    reviewCount: z.number().nullable(),
    productHuntUpvotes: z.number().nullable(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  marketPosition: z.object({
    category: z.string(),
    positionDescription: z.string(),
    differentiators: z.array(z.string()),
  }),
});

export type CompetitorProfile = z.infer<typeof CompetitorProfileSchema>;

export const CompetitorJobConfigSchema = z.object({
  competitorName: z.string().min(1),
  competitorUrl: z.string().url(),
  competitorOneLiner: z.string(),
  whyCompetitor: z.string(),
  discoveryResultId: z.string().cuid(),
  parentJobId: z.string().cuid(),
});

export type CompetitorJobConfig = z.infer<typeof CompetitorJobConfigSchema>;
