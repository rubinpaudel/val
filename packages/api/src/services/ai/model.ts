import { withTracing } from "@posthog/ai";
import { google } from "@ai-sdk/google";
import { PostHog } from "posthog-node";
import { env } from "@val/env/server";

const POSTHOG_HOST = "https://eu.i.posthog.com";

let phClient: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  if (phClient) return phClient;
  const apiKey = env.POSTHOG_API_KEY;
  if (!apiKey) return null;
  const host = env.POSTHOG_HOST ?? POSTHOG_HOST;
  phClient = new PostHog(apiKey, { host });
  return phClient;
}

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
export function getTracedModel(options?: TracingOptions) {
  const client = getPostHogClient();
  if (!client) return baseModel;
  return withTracing(baseModel, client, {
    posthogDistinctId: options?.posthogDistinctId,
    posthogTraceId: options?.posthogTraceId,
    posthogProperties: options?.posthogProperties,
  });
}

/**
 * Call during graceful shutdown to flush PostHog events.
 */
export async function shutdownPostHog(): Promise<void> {
  if (phClient) {
    await phClient.shutdown();
    phClient = null;
  }
}
