"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { trpc } from "@/utils/trpc";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    ...trpc.user.me.queryOptions(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isError) {
      router.replace("/auth/signin");
      return;
    }
    if (!isLoading && data && !data.betaAccess) {
      router.replace("/waitlist");
    }
  }, [data, isLoading, isError, router]);

  if (isLoading || isError || (data && !data.betaAccess)) {
    return (
      <div className="flex h-svh w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <span role="img" aria-label="unicorn">
              🦄
            </span>
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-svh w-full flex-col">
      <header className="flex items-center justify-center py-8">
        <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <span role="img" aria-label="unicorn">
            🦄
          </span>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center overflow-auto px-4">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
