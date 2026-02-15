import { withTracing } from "@posthog/ai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { PostHog } from "posthog-node";

export interface TracingOptions {
  posthogDistinctId?: string;
  posthogTraceId?: string;
  posthogProperties?: Record<string, unknown>;
}

const baseModel = google("gemini-2.0-flash");

/**
 * Returns the AI model with PostHog tracing when a client is provided.
 * Otherwise returns the plain model.
 */
export function getTracedModel(posthogClient?: PostHog | null, options?: TracingOptions): LanguageModel {
  if (!posthogClient) return baseModel;
  return withTracing(baseModel, posthogClient, {
    posthogDistinctId: options?.posthogDistinctId,
    posthogTraceId: options?.posthogTraceId,
    posthogProperties: {
      ...options?.posthogProperties,
      source: "server",
    },
  });
}
