"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

type ProjectStatus =
  | "DRAFT"
  | "STRUCTURED"
  | "ANSWERED"
  | "RESEARCHING"
  | "RESEARCHED"
  | "TESTING"
  | "VALIDATED"
  | "SHELVED"
  | "KILLED";

const statusColors: Record<ProjectStatus, string> = {
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

export function ProjectGrid() {
  const projects = useQuery(trpc.project.list.queryOptions({ limit: 20 }));

  if (projects.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!projects.data?.projects.length) {
    return (
      <p className="text-center text-muted-foreground">
        No projects yet. Start brainstorming!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.data.projects.map((project) => {
        const title = project.title || project.rawBraindump.slice(0, 60);
        const status = project.status as ProjectStatus;

        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
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
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
