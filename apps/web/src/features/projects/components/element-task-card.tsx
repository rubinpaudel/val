"use client";

import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ElementTaskCardProps {
  element: {
    id: string;
    elementType: string;
    statedValue: string | null;
    clarityScore: number | null;
    missingInfo: string[];
  };
  unansweredCount: number;
  isComplete: boolean;
  onClarify?: () => void;
}

export function ElementTaskCard({
  element,
  unansweredCount,
  isComplete,
  onClarify,
}: ElementTaskCardProps) {
  const t = useTranslations("elements");
  const label = t.has(element.elementType) ? t(element.elementType) : element.elementType;
  const clarityScore = element.clarityScore ?? 0;
  const clarityVariant =
    clarityScore >= 7 ? "default" : clarityScore >= 4 ? "secondary" : "outline";

  return (
    <Card className={cn("gap-0 py-0 shadow-none", isComplete && "opacity-50")}>
      <CardHeader className="p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">{label}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {element.statedValue || (
              <span className="italic">{t("not-mentioned")}</span>
            )}
          </p>
        </div>
        <CardAction>
          {isComplete ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Check className="size-4" />
              <span className="text-xs">{t("clear")}</span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClarify?.()}
            >
              {t("clarify")}
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </CardAction>
      </CardHeader>
      {!isComplete && unansweredCount > 0 && (
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-xs text-muted-foreground">
            {t("questions-to-answer", { count: unansweredCount })}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
