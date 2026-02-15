import { ToolLoopAgent, stepCountIs } from "ai";
import prisma, {
  ResearchAgentType,
  ResearchJobStatus,
  ConfidenceLevel,
  SourceType,
} from "@val/db";
import type { PostHog } from "posthog-node";
import { getTracedModel } from "../../core/model";
import { Logger } from "../../core/logger";
import { composeSkills } from "../skill-registry";
import { CompetitorDiscoverySchema } from "./competitor-discovery.schema";
import {
  extractGroundingSources,
  parseJsonFromText,
} from "../../research/utils";
import crypto from "node:crypto";

const logger = new Logger({ service: "competitor-discovery" });

export interface ProjectContext {
  projectId: string;
  rawBraindump: string;
  title: string | null;
  elements: Array<{
    elementType: string;
    statedValue: string | null;
  }>;
  questionsAndAnswers: Array<{
    questionText: string;
    answerText: string | null;
  }>;
}

export interface AddResearchJobFn {
  (data: {
    frameworkId: string;
    frameworkType: string;
    projectId: string;
    projectDescription: string;
    maxDuration?: number;
  }): Promise<{ jobId: string }>;
}

export async function runCompetitorDiscovery(
  context: ProjectContext,
  researchJobId: string,
  addResearchJob: AddResearchJobFn,
  posthogClient?: PostHog | null,
): Promise<void> {
  const { projectId } = context;
  logger.info("Starting competitor discovery", { projectId });

  // Compose skills: competitor-discovery instructions + google-search tool
  const { instructions, tools } = composeSkills(
    "competitor-discovery",
    "google-search",
  );

  const model = getTracedModel(posthogClient, {
    posthogProperties: { projectId, type: "competitor-discovery" },
  });

  const agent = new ToolLoopAgent({
    model,
    instructions,
    tools,
    stopWhen: stepCountIs(10),
    onStepFinish: async ({ stepNumber }) => {
      await prisma.researchJob.update({
        where: { id: researchJobId },
        data: {
          progressPercent: Math.min(50, stepNumber * 10),
          progressMessage: "Searching for competitors...",
        },
      });
    },
  });

  // Build the prompt with full project context
  const elementsText = context.elements
    .map((el) => `- ${el.elementType}: ${el.statedValue || "Not specified"}`)
    .join("\n");

  const qaText =
    context.questionsAndAnswers.length > 0
      ? context.questionsAndAnswers
          .map(
            (qa) =>
              `Q: ${qa.questionText}\nA: ${qa.answerText || "Skipped"}`,
          )
          .join("\n\n")
      : "No Q&A available";

  const prompt = `Find competitors for this project:

## Project: ${context.title || "Untitled"}

### Brain Dump
${context.rawBraindump}

### Extracted Elements
${elementsText}

### Founder Q&A
${qaText}`;

  // Run the agent
  const result = await agent.generate({ prompt });

  // Parse and validate the output
  let competitors;
  try {
    const parsed = parseJsonFromText(result.text);
    competitors = CompetitorDiscoverySchema.parse(parsed);
  } catch (parseError) {
    logger.error(
      "Failed to parse competitor discovery output",
      parseError instanceof Error ? parseError : undefined,
      { projectId },
    );
    throw new Error("Failed to parse competitor discovery results");
  }

  logger.info("Competitors discovered", {
    projectId,
    count: competitors.competitors.length,
  });

  // Extract sources from grounding metadata
  const groundingSources = extractGroundingSources(result);

  await prisma.researchJob.update({
    where: { id: researchJobId },
    data: {
      progressPercent: 60,
      progressMessage: `Found ${competitors.competitors.length} competitors. Starting deep research...`,
    },
  });

  // For each competitor: create ResearchResult, Source, SourceCitation, and spawn sub-job
  for (const competitor of competitors.competitors) {
    // Create a ResearchResult for the discovery
    const researchResult = await prisma.researchResult.create({
      data: {
        projectId,
        researchJobId,
        resultType: "competitor_discovery",
        agentType: ResearchAgentType.COMPETITOR_INTEL,
        confidence: ConfidenceLevel.LOW,
        data: {
          name: competitor.name,
          url: competitor.url,
          oneLiner: competitor.oneLiner,
          whyCompetitor: competitor.whyCompetitor,
          status: "pending_deep_research",
        },
      },
    });

    // Store any matching grounding sources
    for (const gs of groundingSources) {
      if (
        gs.url.includes(new URL(competitor.url).hostname) ||
        gs.title.toLowerCase().includes(competitor.name.toLowerCase())
      ) {
        const urlHash = crypto
          .createHash("sha256")
          .update(gs.url)
          .digest("hex");

        const source = await prisma.source.upsert({
          where: { urlHash },
          create: {
            sourceType: SourceType.WEB_PAGE,
            title: gs.title,
            url: gs.url,
            discoveredBy: "competitor-discovery",
            urlHash,
          },
          update: {},
        });

        await prisma.sourceCitation.create({
          data: {
            sourceId: source.id,
            researchResultId: researchResult.id,
          },
        });
      }
    }

    // Create the COMPETITOR_INTEL sub-job
    const subJob = await prisma.researchJob.create({
      data: {
        projectId,
        agentType: ResearchAgentType.COMPETITOR_INTEL,
        status: ResearchJobStatus.QUEUED,
        config: {
          competitorName: competitor.name,
          competitorUrl: competitor.url,
          competitorOneLiner: competitor.oneLiner,
          whyCompetitor: competitor.whyCompetitor,
          discoveryResultId: researchResult.id,
          parentJobId: researchJobId,
        },
      },
    });

    // Queue the sub-job
    await addResearchJob({
      frameworkId: subJob.id,
      frameworkType: "COMPETITOR_INTEL",
      projectId,
      projectDescription: `Deep research on competitor: ${competitor.name} - ${competitor.oneLiner}`,
    });

    logger.info("Competitor sub-job queued", {
      projectId,
      competitorName: competitor.name,
      subJobId: subJob.id,
    });
  }

  await prisma.researchJob.update({
    where: { id: researchJobId },
    data: {
      progressPercent: 80,
      progressMessage: `${competitors.competitors.length} competitor research jobs spawned`,
      resultsSummary: {
        competitorsFound: competitors.competitors.length,
        competitors: competitors.competitors.map((c) => c.name),
      },
    },
  });
}
