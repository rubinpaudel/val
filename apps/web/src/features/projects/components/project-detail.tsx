"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/utils/trpc";

import { type ProjectStatus, statusLabels } from "../types/project-status";
import { ClarificationChat } from "./clarification-chat";
import { ElementTaskCard } from "./element-task-card";
import { ProjectChat } from "./project-chat";
import { ProjectDetailSkeleton } from "./project-detail-skeleton";

export function ProjectDetail({ projectId }: { projectId: string }) {
  const [clarifyingElement, setClarifyingElement] = useState<{
    id: string;
    elementType: string;
    statedValue: string | null;
  } | null>(null);

  const { data: project, isLoading: isProjectLoading } = useQuery({
    ...trpc.project.getById.queryOptions({ id: projectId }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "draft" ? 3000 : false;
    },
  });

  const { data: questionsData } = useQuery({
    ...trpc.question.list.queryOptions({
      projectId,
      includeAnswered: true,
    }),
    enabled: !!project && project.status !== "draft",
  });

  if (isProjectLoading) {
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
  const isDraft = status === "DRAFT";

  // Count unanswered questions per element category
  const unansweredByCategory: Record<string, number> = {};
  if (questionsData?.questions) {
    for (const q of questionsData.questions) {
      const cat = (q.category ?? "GENERAL").toLowerCase();
      if (!q.answer) {
        unansweredByCategory[cat] = (unansweredByCategory[cat] ?? 0) + 1;
      }
    }
  }

  // Determine completion per element
  const elements = project.elements ?? [];
  const isElementComplete = (el: (typeof elements)[0]) => {
    const cat = el.elementType.toLowerCase();
    const unanswered = unansweredByCategory[cat] ?? 0;
    return (el.clarityScore ?? 0) >= 7 && unanswered === 0;
  };

  const incompleteElements = elements.filter((el) => !isElementComplete(el));
  const completeElements = elements.filter((el) => isElementComplete(el));

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
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

      {/* Chat */}
      <ProjectChat projectId={projectId} />

      {/* Elements as tasks */}
      {isDraft ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="size-4 animate-spin" />
          Val is analyzing your braindump...
        </div>
      ) : (
        <>
          {incompleteElements.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                To clarify
              </h2>
              <div className="flex flex-col gap-2">
                {incompleteElements.map((element) => (
                  <ElementTaskCard
                    key={element.id}
                    element={element}
                    unansweredCount={
                      unansweredByCategory[element.elementType.toLowerCase()] ?? 0
                    }
                    isComplete={false}
                    onClarify={() => setClarifyingElement(element)}
                  />
                ))}
              </div>
            </section>
          )}

          {completeElements.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Completed
              </h2>
              <div className="flex flex-col gap-2">
                {completeElements.map((element) => (
                  <ElementTaskCard
                    key={element.id}
                    element={element}
                    unansweredCount={0}
                    isComplete
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Clarification chat sheet */}
      {clarifyingElement && (
        <ClarificationChat
          element={clarifyingElement}
          projectId={projectId}
          unansweredCount={
            unansweredByCategory[clarifyingElement.elementType.toLowerCase()] ?? 0
          }
          open={!!clarifyingElement}
          onOpenChange={(open) => {
            if (!open) setClarifyingElement(null);
          }}
        />
      )}
    </div>
  );
}
