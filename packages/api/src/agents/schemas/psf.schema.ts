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
