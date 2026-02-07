"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { CornerDownLeftIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useCreateProject } from "../hooks/use-create-project";

export function ProjectForm() {
  const createProject = useCreateProject();
  const [value, setValue] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    await createProject.mutateAsync({ rawBraindump: text });
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (createProject.isPending) return;
      e.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <Textarea
          placeholder="Brain dump your startup idea..."
          className="min-h-24 pr-12 resize-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="submit"
          size="icon-sm"
          className="absolute right-2 bottom-2"
          disabled={createProject.isPending || !value.trim()}
          aria-label="Submit"
        >
          {createProject.isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <CornerDownLeftIcon className="size-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
