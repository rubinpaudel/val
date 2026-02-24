import { generateObject } from "ai";
import prisma, { ConfidenceLevel, SourceType } from "@val/db";
import type { PostHog } from "posthog-node";
import { getTracedModel } from "../../core/model";
import { Logger } from "../../core/logger";
import { loadSkill } from "../skill-registry";
import {
  CompetitorProfileSchema,
  type CompetitorJobConfig,
} from "./competitor-intel.schema";
import {
  createGoogleGenAIClient,
  extractUrlsFromText,
  sleep,
} from "../../research/utils";
import crypto from "node:crypto";

const logger = new Logger({ service: "competitor-intel" });

const DEEP_RESEARCH_AGENT = "deep-research-pro-preview-12-2025";
const POLL_INTERVAL_MS = parseInt(process.env.GEMINI_POLL_INTERVAL_MS ?? "10000", 10);
const MAX_POLL_ATTEMPTS = parseInt(process.env.GEMINI_MAX_POLL_ATTEMPTS ?? "120", 10);

export async function runCompetitorIntel(
  researchJobId: string,
  config: CompetitorJobConfig,
  posthogClient?: PostHog | null,
): Promise<void> {
  const { competitorName, competitorUrl, competitorOneLiner, discoveryResultId } =
    config;
  logger.info("Starting competitor deep research", {
    competitorName,
    researchJobId,
  });

  // Idempotency check: skip if already completed (handles retries)
  const existingResult = await prisma.researchResult.findUnique({
    where: { id: discoveryResultId },
  });

  if (
    existingResult?.resultType === "competitor_profile" &&
    existingResult.data &&
    typeof existingResult.data === "object" &&
    "status" in existingResult.data &&
    existingResult.data.status === "complete"
  ) {
    logger.info("Competitor intel already completed, skipping (retry scenario)", {
      competitorName,
      researchJobId,
    });
    return;
  }

  const skillInstructions = loadSkill("competitor-intel").instructions;

  // Phase 1: Gemini Deep Research via Interactions API
  await prisma.researchJob.update({
    where: { id: researchJobId },
    data: {
      progressPercent: 5,
      progressMessage: `Starting deep research on ${competitorName}...`,
    },
  });

  const client = createGoogleGenAIClient();

  const researchPrompt = `${skillInstructions}

## Competitor to Research
- **Name**: ${competitorName}
- **Website**: ${competitorUrl}
- **Description**: ${competitorOneLiner}

Research this company thoroughly. Search for their website, Product Hunt page, app store listings, Crunchbase profile, reviews on G2/Capterra, news articles, and social media presence.

Provide a comprehensive research report with all findings organized by: Company Overview, Product & Features, Pricing, Traction & Growth, Strengths, Weaknesses, and Market Position.`;

  let interaction;
  try {
    interaction = await client.interactions.create({
      input: researchPrompt,
      agent: DEEP_RESEARCH_AGENT,
      background: true,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Categorize and log specific error types
    if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      logger.warn("Gemini API rate limit hit", {
        competitorName,
        error: errorMessage,
      });
      throw new Error(
        `Rate limit reached for ${competitorName}. Will retry later.`,
      );
    } else if (
      errorMessage.includes("auth") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403")
    ) {
      logger.error("Gemini API authentication failed", error instanceof Error ? error : undefined, {
        error: errorMessage,
      });
      throw new Error("Gemini API authentication failed. Check API key.");
    } else if (
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("ECONNREFUSED")
    ) {
      logger.warn("Gemini API network error", {
        competitorName,
        error: errorMessage,
      });
      throw new Error(
        `Network error researching ${competitorName}. Will retry.`,
      );
    } else {
      logger.error(
        "Gemini API unexpected error",
        error instanceof Error ? error : undefined,
        { competitorName },
      );
      throw new Error(
        `Failed to start research for ${competitorName}: ${errorMessage}`,
      );
    }
  }

  logger.info("Deep Research started", {
    competitorName,
    interactionId: interaction.id,
  });

  // Poll for completion
  let deepResearchReport = "";
  let pollAttempts = 0;

  while (pollAttempts < MAX_POLL_ATTEMPTS) {
    pollAttempts++;

    const result = await client.interactions.get(interaction.id!);
    const status = result.status;

    if (status === "completed") {
      deepResearchReport =
        (() => {
          const lastOutput = result.outputs?.[result.outputs.length - 1];
          return lastOutput && "text" in lastOutput ? (lastOutput.text ?? "") : "";
        })();
      logger.info("Deep Research completed", {
        competitorName,
        reportLength: deepResearchReport.length,
      });
      break;
    }

    if (status === "failed" || status === "cancelled") {
      throw new Error(
        `Deep Research ${status} for ${competitorName}`,
      );
    }

    // Update progress
    const progressPercent = Math.min(
      70,
      5 + Math.round((pollAttempts / MAX_POLL_ATTEMPTS) * 65),
    );
    await prisma.researchJob.update({
      where: { id: researchJobId },
      data: {
        progressPercent,
        progressMessage: `Deep researching ${competitorName}...`,
      },
    });

    await sleep(POLL_INTERVAL_MS);
  }

  if (!deepResearchReport) {
    throw new Error(`Deep Research timed out for ${competitorName}`);
  }

  // Phase 2: Parse report into structured data
  await prisma.researchJob.update({
    where: { id: researchJobId },
    data: {
      progressPercent: 75,
      progressMessage: `Structuring ${competitorName} data...`,
    },
  });

  let profile;
  try {
    const { object } = await generateObject({
      model: getTracedModel(posthogClient, {
        posthogProperties: {
          type: "competitor-intel-extraction",
          competitorName,
        },
      }),
      schema: CompetitorProfileSchema,
      prompt: `Parse this competitor research report into structured data. Extract all available information. Use null for fields that are not mentioned or cannot be determined.

## Research Report for ${competitorName}

${deepResearchReport}`,
    });
    profile = object;
  } catch (parseError) {
    logger.warn(
      "Failed to parse competitor profile, storing raw report",
      {
        competitorName,
        error:
          parseError instanceof Error
            ? parseError.message
            : String(parseError),
      },
    );

    // Store raw report even if structured extraction fails
    await prisma.researchResult.update({
      where: { id: discoveryResultId },
      data: {
        resultType: "competitor_profile",
        data: {
          name: competitorName,
          url: competitorUrl,
          rawReport: deepResearchReport,
          status: "parse_failed",
        },
        confidence: ConfidenceLevel.LOW,
      },
    });
    return;
  }

  // Phase 3: Determine confidence from data completeness
  const filledFields = [
    profile.companyOverview.foundedYear,
    profile.companyOverview.totalFunding,
    profile.traction.estimatedUsers,
    profile.product.pricingModel,
    profile.strengths.length > 0,
    profile.weaknesses.length > 0,
    profile.product.coreFeatures.length > 0,
  ].filter(Boolean).length;

  const confidence =
    filledFields >= 5
      ? ConfidenceLevel.HIGH
      : filledFields >= 3
        ? ConfidenceLevel.MEDIUM
        : ConfidenceLevel.LOW;

  const confidenceScore =
    filledFields >= 5 ? 0.9 : filledFields >= 3 ? 0.6 : 0.3;

  // Phase 4: Store results
  await prisma.researchJob.update({
    where: { id: researchJobId },
    data: {
      progressPercent: 90,
      progressMessage: `Storing ${competitorName} results...`,
    },
  });

  // Extract URLs from the report for source tracking
  const reportUrls = extractUrlsFromText(deepResearchReport);

  // Create Source records and link via SourceCitation
  let sourceCount = 0;
  for (const url of reportUrls.slice(0, 20)) {
    try {
      const urlHash = crypto
        .createHash("sha256")
        .update(url)
        .digest("hex");

      const source = await prisma.source.upsert({
        where: { urlHash },
        create: {
          sourceType: SourceType.WEB_PAGE,
          url,
          title: new URL(url).hostname,
          discoveredBy: "competitor-intel-deep-research",
          urlHash,
        },
        update: {},
      });

      await prisma.sourceCitation.create({
        data: {
          sourceId: source.id,
          researchResultId: discoveryResultId,
        },
      });

      sourceCount++;
    } catch {
      // Skip invalid URLs
    }
  }

  // Update the ResearchResult with full profile
  await prisma.researchResult.update({
    where: { id: discoveryResultId },
    data: {
      resultType: "competitor_profile",
      data: {
        name: competitorName,
        url: competitorUrl,
        ...profile,
        rawReport: deepResearchReport,
        status: "complete",
      },
      confidence,
      confidenceScore,
      sourceCount,
    },
  });

  await prisma.researchJob.update({
    where: { id: researchJobId },
    data: {
      progressPercent: 100,
      progressMessage: `${competitorName} research complete`,
      resultsSummary: {
        competitorName,
        confidence,
        sourceCount,
        hasProfile: true,
      },
    },
  });

  logger.info("Competitor intel complete", {
    competitorName,
    researchJobId,
    confidence,
    sourceCount,
  });
}
