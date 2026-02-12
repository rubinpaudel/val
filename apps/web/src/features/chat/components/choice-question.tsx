"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{questionText}</p>
      {allowMultiple ? (
        <>
          <div className="flex flex-col">
            {options.map((option) => {
              const id = `choice-${option}`;
              const isSelected = multiSelections.has(option);
              return (
                <label
                  key={option}
                  htmlFor={id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2.5 cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    isSelected && "bg-muted",
                    disabled && "cursor-default opacity-60",
                  )}
                >
                  <Checkbox
                    id={id}
                    checked={isSelected}
                    disabled={disabled}
                    onCheckedChange={() => handleMultiToggle(option)}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              );
            })}
          </div>
          {!disabled && (
            <Button
              size="sm"
              disabled={multiSelections.size === 0}
              onClick={handleMultiConfirm}
            >
              Submit
            </Button>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-1">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => handleSingleSelect(option)}
              className={cn(
                "w-full text-left rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                "hover:bg-primary hover:text-primary-foreground hover:border-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                disabled && "opacity-60 pointer-events-none",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
