import { withTracing } from "@posthog/ai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { getPostHogClient } from "../posthog";

export interface TracingOptions {
  posthogDistinctId?: string;
  posthogTraceId?: string;
  posthogProperties?: Record<string, unknown>;
}

const baseModel = google("gemini-2.0-flash");

/**
 * Returns the AI model with PostHog tracing when POSTHOG_API_KEY is set.
 * Otherwise returns the plain model.
 */
export function getTracedModel(options?: TracingOptions): LanguageModel {
  const client = getPostHogClient();
  if (!client) return baseModel;
  return withTracing(baseModel, client, {
    posthogDistinctId: options?.posthogDistinctId,
    posthogTraceId: options?.posthogTraceId,
    posthogProperties: {
      ...options?.posthogProperties,
      source: "server",
    },
  });
}
