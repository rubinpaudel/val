"use client";

import { Check } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChoiceQuestionProps {
  questionText: string;
  options: string[];
  allowMultiple: boolean;
  disabled?: boolean;
  onSelect?: (answer: string) => void;
}

export function ChoiceQuestion({
  questionText,
  options,
  allowMultiple,
  disabled,
  onSelect,
}: ChoiceQuestionProps) {
  const [multiSelections, setMultiSelections] = useState<Set<string>>(new Set());

  const handleSingleSelect = useCallback(
    (option: string) => {
      if (disabled) return;
      onSelect?.(option);
    },
    [disabled, onSelect],
  );

  const handleMultiToggle = useCallback((option: string) => {
    setMultiSelections((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  }, []);

  const handleMultiConfirm = useCallback(() => {
    if (disabled || multiSelections.size === 0) return;
    onSelect?.(Array.from(multiSelections).join(", "));
  }, [disabled, multiSelections, onSelect]);

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          if (allowMultiple) {
            const isSelected = multiSelections.has(option);
            return (
              <Button
                key={option}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => handleMultiToggle(option)}
                className={cn("text-sm", disabled && "opacity-60")}
              >
                {isSelected && <Check className="size-3 mr-1" />}
                {option}
              </Button>
            );
          }

          return (
            <Button
              key={option}
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => handleSingleSelect(option)}
              className={cn("text-sm", disabled && "opacity-60")}
            >
              {option}
            </Button>
          );
        })}
      </div>

      {allowMultiple && !disabled && (
        <div>
          <Button
            size="sm"
            disabled={multiSelections.size === 0}
            onClick={handleMultiConfirm}
          >
            Confirm ({multiSelections.size} selected)
          </Button>
        </div>
      )}
    </div>
  );
}
