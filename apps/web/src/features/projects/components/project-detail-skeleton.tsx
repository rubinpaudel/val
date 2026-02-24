"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header - matches project-detail.tsx structure */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Chat - gap-2 wrapper to match real page */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>

      {/* ResearchStatusCard placeholder */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-9 w-32 mt-2" />
        </CardContent>
      </Card>

      {/* CompetitorResults placeholder - minimal for null or visible state */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* To clarify section */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </section>

      {/* Completed section */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </section>
    </div>
  );
}
