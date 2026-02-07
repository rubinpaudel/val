"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

import { type ProjectStatus, statusColors } from "@/features/projects";

import { useSidebar } from "./sidebar-context";

export function SidebarProjectList() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  const projects = useQuery(trpc.project.list.queryOptions({ limit: 10 }));

  if (isCollapsed) {
    return null;
  }

  if (projects.isLoading) {
    return (
      <div className="flex flex-col gap-1 px-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!projects.data?.projects.length) {
    return (
      <div className="px-3 py-2 text-xs text-sidebar-foreground/60">
        No projects yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto px-3">
      {projects.data.projects.map((project) => {
        const isActive = pathname === `/projects/${project.id}`;
        const title = project.title || project.rawBraindump.slice(0, 40);
        const status = project.status as ProjectStatus;

        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
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
