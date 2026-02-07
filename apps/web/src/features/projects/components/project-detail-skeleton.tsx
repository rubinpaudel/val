"use client";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Skeleton className="h-5 w-24" />

      {/* Title + status */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <Separator />

      {/* Chat placeholder */}
      <Skeleton className="h-28 w-full rounded-xl" />

      {/* Element task cards */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
