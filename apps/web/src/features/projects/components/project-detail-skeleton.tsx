"use client";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <Skeleton className="h-5 w-24" />
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Separator />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
