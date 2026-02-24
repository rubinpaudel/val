"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ProjectIcon } from "@/components/project-icon";
import { ChatInput, setPendingMessage } from "@/features/chat";
import { trpc } from "@/utils/trpc";

import { type ProjectStatus } from "../types/project-status";
import { ClarificationChat } from "./clarification-chat";
import {
  type ElementTaskCardProps,
  ElementTaskCard,
} from "./element-task-card";
import { ProjectDetailSkeleton } from "./project-detail-skeleton";
import { CompetitorResults } from "./competitor-results";
import { ResearchStatusCard } from "./research-status-card";

type ElementForCard = ElementTaskCardProps["element"];

const DRAFT_POLLING_INTERVAL_MS = 3_000;
const RESEARCHING_POLLING_INTERVAL_MS = 10_000;

export function ProjectDetail({ projectId }: { projectId: string }) {
  const t = useTranslations("projects");
  const tStatus = useTranslations("status");
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [clarifyingElement, setClarifyingElement] = useState<{
    id: string;
    elementType: string;
    statedValue: string | null;
  } | null>(null);

  const { data: project, isLoading: isProjectLoading } = useQuery({
    ...trpc.project.getById.queryOptions({ id: projectId }),
    refetchInterval: (query) => {
      const status = query?.state?.data?.status;
      if (status === "draft") return DRAFT_POLLING_INTERVAL_MS;
      if (status === "researching") return RESEARCHING_POLLING_INTERVAL_MS;
      return false;
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
        <p className="text-muted-foreground">{t("not-found")}</p>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t("back-to-projects")}
        </Link>
      </div>
    );
  }

  const status = project.status as ProjectStatus;
  const isDraft = status === "draft";

  // Show skeleton until project is fully loaded (elements extracted + questions generated)
  if (isDraft || !questionsData) {
    return <ProjectDetailSkeleton />;
  }

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
    return unanswered === 0;
  };

  const incompleteElements = elements.filter((el) => !isElementComplete(el));
  const completeElements = elements.filter((el) => isElementComplete(el));

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-4" />
          {t("back-to-projects")}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ProjectIcon icon={project.icon} className="size-6 text-muted-foreground" />
              <h1 className="text-2xl">
                {project.title || t("untitled-project")}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {project.rawBraindump}
            </p>
          </div>
          <Badge variant="secondary">{tStatus(status)}</Badge>
        </div>
      </div>                  

      {/* Chat */}
      <div className="flex flex-col gap-2">
        <ChatInput
          onSend={(text) => {
            setPendingMessage(projectId, text);
            setIsNavigating(true);
            router.push(`/projects/${projectId}/chat` as never);
          }}
          disabled={isNavigating}
          placeholder={t("chat-input-placeholder")}
        />
      </div>

      {/* Research */}
      <ResearchStatusCard projectId={projectId} projectStatus={status} />

      {/* Competitor Results */}
      <CompetitorResults projectId={projectId} projectStatus={status} />

      {/* Elements as tasks */}
      {incompleteElements.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("to-clarify")}
          </h2>
          <div className="flex flex-col gap-2">
            {incompleteElements.map((element) => (
              <ElementTaskCard
                key={element.id}
                element={element as ElementForCard}
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
            {t("completed")}
          </h2>
          <div className="flex flex-col gap-2">
            {completeElements.map((element) => (
              <ElementTaskCard
                key={element.id}
                element={element as ElementForCard}
                unansweredCount={0}
                isComplete
              />
            ))}
          </div>
        </section>
      )}

      {/* Clarification chat sheet */}
      {clarifyingElement && (
        <ClarificationChat
          key={clarifyingElement.id}
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
