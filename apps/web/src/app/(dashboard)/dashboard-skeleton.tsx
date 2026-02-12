import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex h-svh w-full">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-[18rem] shrink-0 flex-col border-r bg-sidebar p-2">
        {/* Brand */}
        <div className="flex items-center gap-2 px-2 py-3">
          <Skeleton className="size-8 rounded-lg" />
        </div>

        {/* Nav items */}
        <div className="mt-4 flex flex-col gap-1 px-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>

        {/* User footer */}
        <div className="mt-auto px-2 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
