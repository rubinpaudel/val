"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ExternalLink,
  Globe,
  Shield,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

const RESULTS_POLLING_INTERVAL_MS = 10_000;

const confidenceColors: Record<string, string> = {
  HIGH: "bg-green-500/10 text-green-700 dark:text-green-400",
  MEDIUM: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  LOW: "bg-red-500/10 text-red-700 dark:text-red-400",
};

interface ResearchResultItem {
  id: string;
  data: unknown;
  confidence: string;
  confidenceScore: number | null;
  sourceCount: number;
  sources: Array<{
    id: string;
    title: string | null;
    url: string | null;
    sourceType: string;
  }>;
}

interface CompetitorResultsProps {
  projectId: string;
  projectStatus: string;
}

export function CompetitorResults({
  projectId,
  projectStatus,
}: CompetitorResultsProps) {
  const t = useTranslations("competitors");
  const isResearching = projectStatus === "researching";
  const showResults =
    projectStatus === "researching" || projectStatus === "researched";

  const { data: results } = useQuery({
    ...trpc.research.getResults.queryOptions({
      projectId,
      resultType: "competitor_profile",
    }),
    enabled: showResults,
    refetchInterval: isResearching ? RESULTS_POLLING_INTERVAL_MS : false,
  });

  const items = (results ?? []) as ResearchResultItem[];

  if (!showResults || items.length === 0) {
    return null;
  }

  // Only show results that have complete profile data
  const completedResults = items.filter((r) => {
    const data = r.data as Record<string, unknown> | null;
    return data && data.status === "complete";
  });

  if (completedResults.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Target className="size-4" />
        {t("title")}
      </h2>
      <div className="flex flex-col gap-2">
        {completedResults.map((result) => (
          <CompetitorCard key={result.id} result={result} />
        ))}
      </div>
    </section>
  );
}

interface CompetitorCardProps {
  result: {
    id: string;
    data: unknown;
    confidence: string;
    confidenceScore: number | null;
    sourceCount: number;
    sources: Array<{
      id: string;
      title: string | null;
      url: string | null;
      sourceType: string;
    }>;
  };
}

function CompetitorCard({ result }: CompetitorCardProps) {
  const t = useTranslations("competitors");
  const [open, setOpen] = useState(false);
  const data = result.data as Record<string, unknown>;
  const profile = data as {
    companyOverview?: {
      description?: string | null;
      foundedYear?: number | null;
      headquarters?: string | null;
      teamSize?: string | null;
      totalFunding?: string | null;
      keyPeople?: string[] | null;
    };
    product?: {
      coreFeatures?: string[] | null;
      targetAudience?: string | null;
      pricingModel?: string | null;
      pricingTiers?: Array<{
        name: string;
        price: string;
        features: string[];
      }> | null;
      platforms?: string[] | null;
    };
    traction?: {
      estimatedUsers?: string | null;
      estimatedRevenue?: string | null;
      notableCustomers?: string[] | null;
      appStoreRating?: number | null;
      reviewCount?: number | null;
    };
    strengths?: string[];
    weaknesses?: string[];
    marketPosition?: {
      category?: string | null;
      positionDescription?: string | null;
      differentiators?: string[] | null;
    };
    name?: string;
    url?: string;
    oneLiner?: string;
  };

  const name = profile.name || "Unknown Competitor";
  const url = profile.url;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="gap-0 py-0 shadow-none">
        <CollapsibleTrigger asChild>
          <CardHeader className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <CardTitle className="text-sm truncate">{name}</CardTitle>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    confidenceColors[result.confidence] ?? ""
                  )}
                >
                  {t(`confidence-${result.confidence.toLowerCase()}`)}
                </Badge>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    open && "rotate-180"
                  )}
                />
              </div>
            </div>
            {profile.oneLiner && (
              <p className="text-xs text-muted-foreground mt-1">
                {profile.oneLiner}
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 flex flex-col gap-4">
            {/* Overview */}
            {profile.companyOverview?.description && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  {t("overview")}
                </h4>
                <p className="text-sm">{profile.companyOverview.description}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  {profile.companyOverview.foundedYear && (
                    <span>{t("founded", { year: profile.companyOverview.foundedYear })}</span>
                  )}
                  {profile.companyOverview.headquarters && (
                    <span>{profile.companyOverview.headquarters}</span>
                  )}
                  {profile.companyOverview.totalFunding && (
                    <span>{t("funding", { amount: profile.companyOverview.totalFunding })}</span>
                  )}
                  {profile.companyOverview.teamSize && (
                    <span>
                      <Users className="size-3 inline mr-1" />
                      {profile.companyOverview.teamSize}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Product & Pricing */}
            {profile.product && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  {t("product")}
                </h4>
                {profile.product.coreFeatures &&
                  profile.product.coreFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {profile.product.coreFeatures.map((feature) => (
                        <Badge
                          key={feature}
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}
                {profile.product.pricingModel && (
                  <p className="text-xs text-muted-foreground">
                    {t("pricing")}: {profile.product.pricingModel}
                  </p>
                )}
                {profile.product.platforms &&
                  profile.product.platforms.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("platforms")}: {profile.product.platforms.join(", ")}
                    </p>
                  )}
              </div>
            )}

            {/* Traction */}
            {profile.traction && (
              <div className="flex flex-wrap gap-4 text-xs">
                {profile.traction.estimatedUsers && (
                  <div>
                    <span className="text-muted-foreground">{t("users")}</span>
                    <p className="font-medium">{profile.traction.estimatedUsers}</p>
                  </div>
                )}
                {profile.traction.estimatedRevenue && (
                  <div>
                    <span className="text-muted-foreground">{t("revenue")}</span>
                    <p className="font-medium">{profile.traction.estimatedRevenue}</p>
                  </div>
                )}
                {profile.traction.appStoreRating && (
                  <div>
                    <span className="text-muted-foreground">{t("rating")}</span>
                    <p className="font-medium">
                      {profile.traction.appStoreRating}/5
                      {profile.traction.reviewCount &&
                        ` (${profile.traction.reviewCount})`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-3">
              {profile.strengths && profile.strengths.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Shield className="size-3 text-green-500" />
                    {t("strengths")}
                  </h4>
                  <ul className="text-xs space-y-1">
                    {profile.strengths.map((s) => (
                      <li key={s} className="text-muted-foreground">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {profile.weaknesses && profile.weaknesses.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <ShieldAlert className="size-3 text-red-500" />
                    {t("weaknesses")}
                  </h4>
                  <ul className="text-xs space-y-1">
                    {profile.weaknesses.map((w) => (
                      <li key={w} className="text-muted-foreground">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sources */}
            {result.sources.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  {t("sources", { count: result.sources.length })}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.sources.slice(0, 5).map((source) => (
                    <a
                      key={source.id}
                      href={source.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                      {source.title || "Source"}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
