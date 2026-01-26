import { z } from "zod";

// Section analysis schema (reused across sections)
export const sectionAnalysisSchema = z.object({
  score: z.number().min(1).max(10).describe("Score from 1-10 based on evidence quality"),
  keyFindings: z.array(z.string()).describe("Key findings from the research"),
  concerns: z.array(z.string()).describe("Concerns or red flags identified"),
});

export type SectionAnalysis = z.infer<typeof sectionAnalysisSchema>;

// PSF Synthesis schema (for final report)
export const psfSynthesisSchema = z.object({
  summaryScore: z.number().min(1).max(10).describe("Overall score from 1-10 based on all evidence"),
  summaryVerdict: z.enum(["STRONG", "MODERATE", "WEAK"]).describe("Overall verdict"),
  summaryPoints: z.array(z.string()).min(3).max(5).describe("3-5 key summary points"),
  sections: z.object({
    problemEvidence: sectionAnalysisSchema.describe("Analysis of problem evidence"),
    competitorAnalysis: sectionAnalysisSchema.describe("Analysis of competitive landscape"),
    marketSignals: sectionAnalysisSchema.describe("Analysis of market timing and signals"),
  }),
  recommendations: z.array(z.string()).min(3).max(5).describe("3-5 actionable recommendations"),
});

export type PSFSynthesis = z.infer<typeof psfSynthesisSchema>;

// Problem evidence research schema
export const problemEvidenceSchema = z.object({
  evidenceSummary: z.string().describe("Brief overview of what was found"),
  keyEvidence: z.array(
    z.object({
      finding: z.string().describe("The evidence finding"),
      source: z.string().describe("Where this was found"),
      significance: z.enum(["LOW", "MEDIUM", "HIGH"]).describe("How significant this evidence is"),
    })
  ).min(1).max(5).describe("3-5 most important pieces of evidence"),
  painIntensity: z.enum(["LOW", "MEDIUM", "HIGH"]).describe("How intense is the pain"),
  painIntensityJustification: z.string().describe("Why this pain intensity rating"),
  frequency: z.enum(["RARE", "OCCASIONAL", "COMMON", "WIDESPREAD"]).describe("How frequently discussed"),
  willingnessToPay: z.enum(["NONE", "WEAK", "MODERATE", "STRONG"]).describe("Willingness to pay signals"),
  concerns: z.array(z.string()).describe("Concerns or red flags"),
});

export type ProblemEvidence = z.infer<typeof problemEvidenceSchema>;

// Competitor schema
export const competitorSchema = z.object({
  name: z.string().describe("Company/product name"),
  website: z.string().optional().describe("Website URL if found"),
  description: z.string().describe("What they do in one sentence"),
  pricing: z.string().optional().describe("Pricing model if known"),
  strengths: z.array(z.string()).describe("Key strengths"),
  weaknesses: z.array(z.string()).describe("Key weaknesses or gaps"),
  customerSentiment: z.enum(["NEGATIVE", "MIXED", "POSITIVE"]).optional().describe("Overall customer sentiment"),
});

export type Competitor = z.infer<typeof competitorSchema>;

// Competitor analysis research schema
export const competitorAnalysisSchema = z.object({
  marketOverview: z.string().describe("Brief summary of the competitive landscape"),
  directCompetitors: z.array(competitorSchema).max(7).describe("Direct competitors (max 7)"),
  indirectCompetitors: z.array(z.string()).describe("Indirect competitors or workarounds"),
  marketGaps: z.array(z.string()).describe("What's missing in current solutions"),
  differentiationOpportunities: z.array(z.string()).describe("Where startup could stand out"),
  competitiveMoat: z.enum(["WEAK", "MODERATE", "STRONG"]).describe("How defensible is this market"),
  moatJustification: z.string().describe("Why this moat assessment"),
});

export type CompetitorAnalysis = z.infer<typeof competitorAnalysisSchema>;

// Market signals research schema
export const marketSignalsSchema = z.object({
  trendAnalysis: z.object({
    direction: z.enum(["DECLINING", "STABLE", "GROWING", "RAPIDLY_GROWING"]).describe("Market trend direction"),
    evidence: z.string().describe("Evidence for this trend assessment"),
  }),
  fundingSignals: z.array(
    z.object({
      company: z.string().describe("Company name"),
      amount: z.string().optional().describe("Funding amount if known"),
      date: z.string().optional().describe("Approximate date"),
      relevance: z.string().describe("Why this is relevant"),
    })
  ).describe("Recent investments in the space"),
  timingAssessment: z.object({
    verdict: z.enum(["TOO_EARLY", "EARLY", "GOOD_TIMING", "LATE", "TOO_LATE"]).describe("Timing verdict"),
    whyNow: z.string().describe("What's changed that makes now the right time"),
  }),
  marketSizeIndicators: z.string().optional().describe("Any data on market size"),
  technologyTailwinds: z.array(z.string()).describe("Tech trends supporting this idea"),
  riskFactors: z.array(z.string()).describe("What could derail this market"),
});

export type MarketSignals = z.infer<typeof marketSignalsSchema>;
