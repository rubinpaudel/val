"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

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

export function IdeaGrid() {
  const ideas = useQuery(trpc.idea.list.queryOptions({ limit: 20 }));

  if (ideas.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!ideas.data?.ideas.length) {
    return (
      <p className="text-center text-muted-foreground">
        No ideas yet. Start brainstorming!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {ideas.data.ideas.map((idea) => {
        const title = idea.title || idea.rawBraindump.slice(0, 60);
        const status = idea.status as IdeaStatus;

        return (
          <Link
            key={idea.id}
            href={`/ideas/${idea.id}`}
            className="border p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", statusColors[status])}
                title={status.toLowerCase()}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(idea.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
