"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/utils/trpc";

import { type ProjectStatus, statusLabels } from "../types/project-status";
import { ProjectDetailSkeleton } from "./project-detail-skeleton";

const elementTypeLabels: Record<string, string> = {
  who: "Target Audience",
  problem: "Problem",
  solution: "Solution",
  differentiation: "Differentiation",
  monetization: "Monetization",
};

export function ProjectDetail({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId })
  );

  if (isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/projects" className="text-sm underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const status = project.status as ProjectStatus;

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex flex-col gap-4">
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">
              {project.title || "Untitled Project"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {project.rawBraindump}
            </p>
          </div>
          <Badge variant="secondary">{statusLabels[status]}</Badge>
        </div>
      </div>

      <Separator />

      {project.elements && project.elements.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Extracted Elements
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {project.elements.map((element) => {
              const label =
                elementTypeLabels[element.elementType] ?? element.elementType;
              const clarityScore = element.clarityScore ?? 0;
              const clarityVariant =
                clarityScore >= 7
                  ? "default"
                  : clarityScore >= 4
                    ? "secondary"
                    : "outline";

              return (
                <Card key={element.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{label}</CardTitle>
                      <Badge variant={clarityVariant}>
                        {clarityScore}/10
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <p className="text-sm">
                      {element.statedValue || (
                        <span className="text-muted-foreground italic">
                          Not mentioned
                        </span>
                      )}
                    </p>
                    {element.missingInfo.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Missing information:
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {element.missingInfo.map((info, i) => (
                            <li key={i}>{info}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
