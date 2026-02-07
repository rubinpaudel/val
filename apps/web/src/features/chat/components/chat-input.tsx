"use client";

import type { ChatStatus } from "ai";
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
  placeholder = "Type your message...",
  disabled,
  className,
}: ChatInputProps) {
  return (
    <PromptInput
      className={className}
      onSubmit={(message) => {
        if (message.text.trim()) {
          onSend(message.text);
        }
      }}
    >
      <PromptInputTextarea placeholder={placeholder} disabled={disabled} />
      <PromptInputFooter className="flex justify-end">
        <PromptInputSubmit status={status} onStop={onStop} />
      </PromptInputFooter>
    </PromptInput>
  );
}
