"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectIcon } from "@/components/project-icon";
import { trpc } from "@/utils/trpc";

import { type ProjectStatus } from "../types/project-status";

export function ProjectGrid() {
  const projects = useQuery(trpc.project.list.queryOptions({ limit: 4 }));

  if (projects.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-medium text-muted-foreground">Recommended for you</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.data?.projects.map((project) => {
        if (!project) return null;
        const title = project.title || project.rawBraindump.slice(0, 60);
        const status = project.status as ProjectStatus;

        return (
          <Link key={project.id} href={`/projects/${project.id}` as any}>
            <Card className="gap-0 py-0 hover:bg-accent/50 transition-colors">
              <CardHeader className="grid-cols-[auto_1fr_auto] items-center p-4">
                <ProjectIcon icon={project.icon} className="size-5 text-muted-foreground" />
                <CardTitle className="truncate text-sm">{title}</CardTitle>
                <CardDescription className="text-xs">
                  {new Date(project.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
