import { google } from "@ai-sdk/google";
import type { Tool } from "ai";

/**
 * Returns the Google Search grounding tool configured for dynamic mode.
 * The model decides when to search based on the query content.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createGoogleSearchTool(): Tool<any, any> {
  return google.tools.googleSearch({
    mode: "MODE_DYNAMIC",
    dynamicThreshold: 0.7,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as Tool<any, any>;
}
