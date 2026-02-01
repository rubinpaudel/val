"use client";

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

import { useCreateIdea } from "../_hooks/use-create-idea";

export function IdeaForm() {
  const createIdea = useCreateIdea();

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    await createIdea.mutateAsync({ rawBraindump: message.text });
  };

  return (
    <PromptInput onSubmit={handleSubmit} className="max-w-2xl">
      <PromptInputTextarea placeholder="Brain dump your startup idea..." />
      <PromptInputFooter>
        <div />
        <PromptInputSubmit status={createIdea.isPending ? "submitted" : undefined} />
      </PromptInputFooter>
    </PromptInput>
  );
}
