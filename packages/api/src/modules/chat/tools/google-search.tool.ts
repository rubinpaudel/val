import { google } from "@ai-sdk/google";
import type { Tool } from "ai";

/**
 * Returns the Google Search grounding tool configured for dynamic mode.
 * The model decides when to search based on the query content.
 */
export function createGoogleSearchTool(): Tool<any, any> {
  return google.tools.googleSearch({
    mode: "MODE_DYNAMIC",
    dynamicThreshold: 0.7,
  }) as Tool<any, any>;
}
