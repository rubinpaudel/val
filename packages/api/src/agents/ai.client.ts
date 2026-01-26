import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { z } from "zod";

// Google AI provider singleton
let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null;

export function getGoogleProvider() {
  if (!googleProvider) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    googleProvider = createGoogleGenerativeAI({ apiKey });
  }
  return googleProvider;
}

// Default model configuration
export const DEFAULT_MODEL = "gemini-2.0-flash";

// Types for research
export interface ResearchSource {
  title: string;
  url: string;
}

export interface ResearchFindings {
  content: string;
  sources: ResearchSource[];
  searchQueries: string[];
}

// Grounding metadata types (from Google's response)
interface GroundingChunk {
  web?: {
    title?: string;
    uri?: string;
  };
}

interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  webSearchQueries?: string[];
}

// Extract grounding sources from raw response
function extractGroundingSources(rawResponse: unknown): {
  sources: ResearchSource[];
  searchQueries: string[];
} {
  const sources: ResearchSource[] = [];
  const searchQueries: string[] = [];

  if (rawResponse && typeof rawResponse === "object") {
    // Navigate to grounding metadata in the response
    const response = rawResponse as Record<string, unknown>;
    const candidates = response.candidates as Array<Record<string, unknown>> | undefined;

    if (candidates && candidates[0]) {
      const groundingMetadata = candidates[0].groundingMetadata as GroundingMetadata | undefined;

      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web?.uri && chunk.web?.title) {
            sources.push({
              title: chunk.web.title,
              url: chunk.web.uri,
            });
          }
        }
      }

      if (groundingMetadata?.webSearchQueries) {
        searchQueries.push(...groundingMetadata.webSearchQueries);
      }
    }
  }

  return { sources, searchQueries };
}

// Generate content with Google Search grounding for research
export async function generateWithGrounding(
  prompt: string,
  options?: {
    model?: string;
  }
): Promise<ResearchFindings> {
  const provider = getGoogleProvider();
  const modelId = options?.model || DEFAULT_MODEL;

  const result = await generateText({
    model: provider(modelId),
    tools: {
      google_search: provider.tools.googleSearch({}),
    },
    prompt,
  });

  // Extract grounding sources from the raw response
  const { sources, searchQueries } = extractGroundingSources(result.response);

  return {
    content: result.text,
    sources,
    searchQueries,
  };
}

// Generate plain text content (no grounding)
export async function generateContent(
  prompt: string,
  options?: {
    model?: string;
  }
): Promise<string> {
  const provider = getGoogleProvider();
  const modelId = options?.model || DEFAULT_MODEL;

  const result = await generateText({
    model: provider(modelId),
    prompt,
  });

  return result.text;
}

// Generate structured output with schema validation
export async function generateStructuredOutput<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options?: {
    model?: string;
  }
): Promise<T> {
  const provider = getGoogleProvider();
  const modelId = options?.model || DEFAULT_MODEL;

  const result = await generateObject({
    model: provider(modelId),
    schema,
    prompt,
  });

  return result.object;
}
