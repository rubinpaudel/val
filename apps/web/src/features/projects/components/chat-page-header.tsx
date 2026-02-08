"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/utils/trpc";

interface ChatPageHeaderProps {
  projectId: string;
}

export function ChatPageHeader({ projectId }: ChatPageHeaderProps) {
  const { data: project } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId }),
  );

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b">
      <Link
        href={`/projects/${projectId}` as never}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to project
      </Link>
      <span className="text-sm font-medium truncate">
        {project?.title || "Untitled Project"}
      </span>
    </div>
  );
}
