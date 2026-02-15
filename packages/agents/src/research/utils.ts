import { GoogleGenAI } from "@google/genai";

/**
 * Extract grounding source URLs from a ToolLoopAgent GenerateTextResult.
 * Sources come from Google Search grounding metadata across all steps.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractGroundingSources(result: any): Array<{ url: string; title: string }> {
  const seen = new Set<string>();
  const sources: Array<{ url: string; title: string }> = [];

  function extractFromMetadata(metadata: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = metadata as any;
    if (!m?.groundingChunks) return;
    for (const chunk of m.groundingChunks) {
      if (chunk.web?.uri && !seen.has(chunk.web.uri)) {
        seen.add(chunk.web.uri);
        sources.push({
          url: chunk.web.uri,
          title: chunk.web.title || chunk.web.uri,
        });
      }
    }
  }

  // Check step-level metadata
  if (result.steps) {
    for (const step of result.steps) {
      try {
        extractFromMetadata(step.experimental_providerMetadata?.google?.groundingMetadata);
      } catch { /* skip */ }
    }
  }

  // Check top-level metadata
  try {
    extractFromMetadata(result.experimental_providerMetadata?.google?.groundingMetadata);
  } catch { /* skip */ }

  return sources;
}

/**
 * Parse JSON from text that may be wrapped in ```json fences.
 */
export function parseJsonFromText(text: string): unknown {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  const raw = jsonMatch ? jsonMatch[1] : text;
  return JSON.parse(raw!);
}

/**
 * Create a GoogleGenAI client for the Interactions API (Deep Research).
 * Uses the same API key as @ai-sdk/google.
 */
export function createGoogleGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for Deep Research");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Extract URLs from a text report (markdown links, bare URLs).
 */
export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s\])>"']+/g;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
