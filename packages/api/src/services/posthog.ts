import { PostHog } from "posthog-node";
import { env } from "@val/env/server";

const DEFAULT_HOST = "https://eu.i.posthog.com";

let phClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  if (phClient) return phClient;
  const apiKey = env.POSTHOG_API_KEY;
  if (!apiKey) return null;
  const host = env.POSTHOG_HOST ?? DEFAULT_HOST;
  phClient = new PostHog(apiKey, { host });
  return phClient;
}

const identifiedUsers = new Set<string>();

export function identifyUser(params: { userId: string; name: string; email: string }): void {
  if (identifiedUsers.has(params.userId)) return;

  const client = getPostHogClient();
  if (!client) return;

  client.identify({
    distinctId: params.userId,
    properties: {
      name: params.name,
      email: params.email,
      source: "server",
    },
  });

  identifiedUsers.add(params.userId);
}

export async function shutdownPostHog(): Promise<void> {
  if (phClient) {
    await phClient.shutdown();
    phClient = null;
  }
  identifiedUsers.clear();
}
