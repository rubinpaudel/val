"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

import { useSidebar } from "./sidebar-context";

type IdeaStatus =
  | "DRAFT"
  | "STRUCTURED"
  | "ANSWERED"
  | "RESEARCHING"
  | "RESEARCHED"
  | "TESTING"
  | "VALIDATED"
  | "SHELVED"
  | "KILLED";

const statusColors: Record<IdeaStatus, string> = {
  DRAFT: "bg-muted-foreground",
  STRUCTURED: "bg-blue-500",
  ANSWERED: "bg-blue-500",
  RESEARCHING: "bg-yellow-500 animate-pulse",
  RESEARCHED: "bg-green-500",
  TESTING: "bg-yellow-500",
  VALIDATED: "bg-green-500",
  SHELVED: "bg-muted-foreground/50",
  KILLED: "bg-muted-foreground/50",
};

export function SidebarIdeaList() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  const ideas = useQuery(trpc.idea.list.queryOptions({ limit: 10 }));

  if (isCollapsed) {
    return null;
  }

  if (ideas.isLoading) {
    return (
      <div className="flex flex-col gap-1 px-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!ideas.data?.ideas.length) {
    return (
      <div className="px-3 py-2 text-xs text-sidebar-foreground/60">
        No ideas yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto px-3">
      {ideas.data.ideas.map((idea) => {
        const isActive = pathname === `/ideas/${idea.id}`;
        const title = idea.title || idea.rawBraindump.slice(0, 40);
        const status = idea.status as IdeaStatus;

        return (
          <Link
            key={idea.id}
            href={`/ideas/${idea.id}`}
            className={cn(
              "flex items-center gap-2 rounded-none px-2 py-1.5 text-sm transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "truncate",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            title={title}
          >
            <span
              className={cn("size-2 shrink-0 rounded-full", statusColors[status])}
              title={status.toLowerCase()}
            />
            <span className="truncate">{title}</span>
          </Link>
        );
      })}
    </div>
  );
}
