"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { env } from "@val/env/web";
import { authClient } from "@/lib/auth-client";

if (typeof window !== "undefined" && env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    loaded: (ph) => {
      ph.register({ source: "web" });
    },
  });
}

function PostHogIdentifier({ children }: { children: React.ReactNode }) {
  const ph = usePostHog();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!session?.user) {
      ph.reset();
      return;
    }

    ph.identify(session.user.id, {
      name: session.user.name,
      email: session.user.email,
    });
  }, [session?.user, ph]);

  return <>{children}</>;
}

export function PostHogClientProvider({ children }: { children: React.ReactNode }) {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogIdentifier>{children}</PostHogIdentifier>
    </PHProvider>
  );
}
