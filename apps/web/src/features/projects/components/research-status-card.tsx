"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

import { useStartResearch } from "../hooks/use-start-research";

type ResearchJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

type ResearchAgentType =
  | "ORCHESTRATOR"
  | "COMPETITOR_INTEL"
  | "MARKET_SIZING"
  | "BUSINESS_MODEL"
  | "TECHNICAL_FEASIBILITY"
  | "REGULATORY"
  | "TIMING_TRENDS";

const RESEARCH_POLLING_INTERVAL_MS = 5_000;

const statusConfig: Record<
  ResearchJobStatus,
  {
    icon: typeof Loader2;
    label: string;
    animate: string;
  }
> = {
  QUEUED: { icon: Loader2, label: "Queued", animate: "" },
  RUNNING: {
    icon: Loader2,
    label: "Running",
    animate: "animate-spin",
  },
  COMPLETED: {
    icon: CheckCircle2,
    label: "Completed",
    animate: "",
  },
  FAILED: { icon: XCircle, label: "Failed", animate: "" },
  CANCELLED: { icon: Ban, label: "Cancelled", animate: "" },
};

const agentTypeLabels: Record<ResearchAgentType, string> = {
  ORCHESTRATOR: "Orchestrator",
  COMPETITOR_INTEL: "Competitor Intel",
  MARKET_SIZING: "Market Sizing",
  BUSINESS_MODEL: "Business Model",
  TECHNICAL_FEASIBILITY: "Technical Feasibility",
  REGULATORY: "Regulatory",
  TIMING_TRENDS: "Timing & Trends",
};

interface ResearchStatusCardProps {
  projectId: string;
  projectStatus: string;
}

export function ResearchStatusCard({
  projectId,
  projectStatus,
}: ResearchStatusCardProps) {
  const t = useTranslations("research");
  const startResearch = useStartResearch(projectId);
  const canStartResearch = projectStatus === "answered";
  const isResearching = projectStatus === "researching";

  const { data: researchStatus } = useQuery({
    ...trpc.research.getStatus.queryOptions({ projectId }),
    enabled: isResearching,
    refetchInterval: isResearching ? RESEARCH_POLLING_INTERVAL_MS : false,
  });

  if (canStartResearch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="size-4" />
            {t("ready-title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {t("ready-description")}
          </p>
          <Button
            onClick={() => startResearch.mutate({ projectId })}
            disabled={startResearch.isPending}
          >
            {startResearch.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("starting")}
              </>
            ) : (
              <>
                <FlaskConical className="size-4" />
                {t("start-button")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isResearching && researchStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            {t("in-progress-title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${researchStatus.overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("complete-percent", {
              percent: researchStatus.overallProgress,
            })}
          </p>

          {researchStatus.jobs.map((job) => {
            const config = statusConfig[job.status] ?? statusConfig.QUEUED;
            const Icon = config.icon;
            return (
              <div
                key={job.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground">
                  {agentTypeLabels[job.agentType] ?? job.agentType}
                </span>
                <Badge variant="secondary" className="text-xs">
                  <Icon className={`size-3 ${config.animate}`} />
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return null;
}
