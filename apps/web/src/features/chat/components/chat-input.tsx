"use client";

import type { ChatStatus } from "ai";
import { useTranslations } from "next-intl";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

interface ChatInputProps {
  onSend: (text: string) => void;
  status?: ChatStatus;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({
  onSend,
  status,
  onStop,
  placeholder,
  disabled,
  className,
}: ChatInputProps) {
  const t = useTranslations("chat");
  const resolvedPlaceholder = placeholder ?? t("default-placeholder");
  return (
    <PromptInput
      className={className}
      onSubmit={(message) => {
        if (message.text.trim()) {
          onSend(message.text);
        }
      }}
    >
      <PromptInputTextarea placeholder={resolvedPlaceholder} disabled={disabled} />
      <PromptInputFooter className="flex justify-end">
        <PromptInputSubmit status={status} onStop={onStop} />
      </PromptInputFooter>
    </PromptInput>
  );
}
