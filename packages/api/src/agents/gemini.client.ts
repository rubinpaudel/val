import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";

// Gemini client singleton
let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Types for grounding metadata
export interface GroundingChunk {
  web?: {
    title?: string;
    uri?: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  webSearchQueries?: string[];
}

export interface ResearchSource {
  title: string;
  url: string;
}

export interface ResearchFindings {
  content: string;
  sources: ResearchSource[];
  searchQueries: string[];
}

// Extract grounding sources from Gemini response
export function extractGroundingSources(
  response: GenerateContentResponse
): ResearchFindings {
  const candidate = response.candidates?.[0];
  if (!candidate) {
    return {
      content: "",
      sources: [],
      searchQueries: [],
    };
  }

  const groundingMetadata = candidate.groundingMetadata as GroundingMetadata | undefined;
  const sources: ResearchSource[] =
    groundingMetadata?.groundingChunks
      ?.filter((chunk) => chunk.web?.uri && chunk.web?.title)
      .map((chunk) => ({
        title: chunk.web!.title!,
        url: chunk.web!.uri!,
      })) || [];

  const content =
    candidate.content?.parts
      ?.map((part) => ("text" in part ? part.text : ""))
      .join("") || "";

  return {
    content,
    sources,
    searchQueries: groundingMetadata?.webSearchQueries || [],
  };
}

// Generate content with Google Search grounding
export async function generateWithGrounding(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
  }
): Promise<ResearchFindings> {
  const client = getGeminiClient();
  const model = options?.model || "gemini-2.0-flash";

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    config: {
      maxOutputTokens: options?.maxTokens || 8192,
      tools: [
        {
          googleSearch: {},
        },
      ],
    },
  });

  return extractGroundingSources(response);
}

// Generate content without grounding (for analysis/synthesis)
export async function generateContent(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getGeminiClient();
  const model = options?.model || "gemini-2.0-flash";

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    config: {
      maxOutputTokens: options?.maxTokens || 8192,
    },
  });

  const candidate = response.candidates?.[0];
  if (!candidate) {
    return "";
  }

  return (
    candidate.content?.parts
      ?.map((part) => ("text" in part ? part.text : ""))
      .join("") || ""
  );
}

// Parse JSON from Gemini response (handles markdown code blocks)
export function parseJsonResponse<T>(response: string): T {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}
