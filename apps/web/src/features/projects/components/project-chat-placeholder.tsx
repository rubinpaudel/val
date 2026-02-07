"use client";

import type { FormEvent } from "react";

import {
  type PromptInputMessage,
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { toast } from "sonner";

export function ProjectChatPlaceholder() {
  const handleSubmit = async (
    _message: PromptInputMessage,
    _event: FormEvent<HTMLFormElement>,
  ) => {
    toast.info("Chat coming soon");
  };

  return (
    <PromptInput className="w-full" onSubmit={handleSubmit}>
      <PromptInputTextarea placeholder="Chat with your project..." />
      <PromptInputFooter className="flex justify-end">
        <PromptInputSubmit />
      </PromptInputFooter>
    </PromptInput>
  );
}
