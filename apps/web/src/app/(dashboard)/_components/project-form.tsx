"use client";

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

import { useCreateProject } from "../_hooks/use-create-project";

export function ProjectForm() {
  const createProject = useCreateProject();

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    await createProject.mutateAsync({ rawBraindump: message.text });
  };

  return (
    <PromptInput onSubmit={handleSubmit} className="max-w-2xl">
      <PromptInputTextarea placeholder="Brain dump your startup idea..." />
      <PromptInputFooter>
        <div />
        <PromptInputSubmit status={createProject.isPending ? "submitted" : undefined} />
      </PromptInputFooter>
    </PromptInput>
  );
}
