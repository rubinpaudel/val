"use client";

import type { FormEvent } from "react";

import {
  type PromptInputMessage,
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

import { useCreateProject } from "../hooks/use-create-project";

export function ProjectForm() {
  const createProject = useCreateProject();

  const handleSubmit = async (
    message: PromptInputMessage,
    _event: FormEvent<HTMLFormElement>
  ) => {
    const text = message.text.trim();
    if (!text) return;
    await createProject.mutateAsync({ rawBraindump: text });
  };

  return (
    <PromptInput
      className="w-full max-w-2xl"
      onSubmit={handleSubmit}
    >
      <PromptInputTextarea placeholder="Brain dump your startup idea..." />
      <PromptInputFooter className="flex justify-end">
        <PromptInputSubmit
          status={createProject.isPending ? "submitted" : undefined}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
