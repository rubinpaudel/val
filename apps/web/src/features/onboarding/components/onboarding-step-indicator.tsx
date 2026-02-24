import { Check } from "lucide-react";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Idea" },
  { id: 2, label: "Analyzing" },
  { id: 3, label: "Questions" },
  { id: 4, label: "Research" },
] as const;

interface OnboardingStepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function OnboardingStepIndicator({
  currentStep,
  totalSteps = 4,
}: OnboardingStepIndicatorProps) {
  const steps = STEPS.slice(0, totalSteps);

  return (
    <nav aria-label="Onboarding progress">
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <Fragment key={step.id}>
              <li
                aria-current={isCurrent ? "step" : undefined}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    isUpcoming &&
                      "border-border bg-background text-muted-foreground/50",
                  )}
                >
                  {isCompleted ? (
                    <Check
                      className="h-3.5 w-3.5"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="text-xs font-semibold" aria-hidden="true">
                      {step.id}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "hidden sm:block text-xs font-medium whitespace-nowrap transition-colors",
                    isCompleted && "text-primary",
                    isCurrent && "text-foreground",
                    isUpcoming && "text-muted-foreground/50",
                  )}
                >
                  {step.label}
                </span>
              </li>

              {index < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "mt-4 h-0.5 flex-1 mx-2 transition-colors",
                    isCompleted ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
