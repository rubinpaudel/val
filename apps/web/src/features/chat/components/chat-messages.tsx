"use client";

import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { ChoiceQuestion } from "./choice-question";
import { MarkdownContent } from "./markdown-content";

interface PresentChoiceData {
  questionId: string;
  questionText: string;
  options: string[];
  allowMultiple: boolean;
}

interface ChoiceInvocation {
  toolCallId: string;
  data: PresentChoiceData;
}

/**
 * Extract present_choice tool invocations from message parts.
 * Handles both AI SDK streaming format (type: "tool-present_choice" / "dynamic-tool")
 * and DB persistence format (type: "tool-invocation").
 */
function extractChoiceInvocations(parts: unknown[]): ChoiceInvocation[] {
  const results: ChoiceInvocation[] = [];

  for (const part of parts) {
    const p = part as Record<string, unknown>;
    if (!p || typeof p !== "object") continue;

    const type = p.type as string;

    // AI SDK streaming format: type is "tool-present_choice"
    if (type === "tool-present_choice" || type === "dynamic-tool") {
      const toolName = type === "dynamic-tool" ? (p.toolName as string) : "present_choice";
      if (toolName !== "present_choice") continue;

      const state = p.state as string;
      if (state !== "output-available" && state !== "result") continue;

      const data = (p.output ?? p.result) as PresentChoiceData | undefined;
      if (data?.questionText && data?.options) {
        results.push({ toolCallId: p.toolCallId as string, data });
      }
    }

    // DB persistence format: type is "tool-invocation"
    if (type === "tool-invocation") {
      const toolName = p.toolName as string;
      if (toolName !== "present_choice") continue;

      const data = (p.result ?? p.output) as PresentChoiceData | undefined;
      if (data?.questionText && data?.options) {
        results.push({ toolCallId: p.toolCallId as string, data });
      }
    }
  }

  return results;
}

interface SourceData {
  sourceId: string;
  url: string;
  title?: string;
}

function extractSources(parts: unknown[]): SourceData[] {
  const results: SourceData[] = [];
  for (const part of parts) {
    const p = part as Record<string, unknown>;
    if (p?.type === "source-url" && typeof p.url === "string" && typeof p.sourceId === "string") {
      results.push({ sourceId: p.sourceId, url: p.url, title: p.title as string | undefined });
    }
  }
  return results;
}

interface ChatMessagesProps {
  messages: UIMessage[];
  onSend?: (text: string) => void;
  className?: string;
  variant?: "sidebar" | "page";
}

export function ChatMessages({ messages, onSend, className, variant = "page" }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col", variant === "sidebar" ? "gap-3" : "gap-6", className)}>
      {messages.map((message, messageIndex) => {
        const text = message.parts
          .filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text)
          .join("");

        const sources = extractSources(message.parts as unknown[]);
        const choiceInvocations = extractChoiceInvocations(message.parts as unknown[]);

        // Skip messages with no visible content
        if (!text.trim() && choiceInvocations.length === 0) return null;

        // Check if this choice has been answered (a user message follows)
        const hasFollowingUserMessage = messages
          .slice(messageIndex + 1)
          .some((m) => m.role === "user");

        // User message — bubble style
        if (message.role === "user") {
          return (
            <div key={message.id} className="flex flex-col gap-2">
              {text.trim() && (
                <div
                  className={cn(
                    "flex w-full",
                    variant === "page" ? "justify-end" : "",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                      "bg-primary text-primary-foreground",
                      variant === "page" ? "max-w-[80%]" : "max-w-[85%]",
                    )}
                  >
                    {text}
                  </div>
                </div>
              )}
            </div>
          );
        }

        // Assistant message — markdown, no bubble
        return (
          <div key={message.id} className="flex flex-col gap-2">
            {text.trim() && (
              <MarkdownContent content={text} />
            )}

            {sources.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground">Sources:</p>
                {sources.map((source) => (
                  <a
                    key={source.sourceId}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block"
                  >
                    {source.title || new URL(source.url).hostname}
                  </a>
                ))}
              </div>
            )}

            {choiceInvocations.map((invocation) => (
              <div key={invocation.toolCallId}>
                <ChoiceQuestion
                  questionText={invocation.data.questionText}
                  options={invocation.data.options}
                  allowMultiple={invocation.data.allowMultiple}
                  disabled={hasFollowingUserMessage}
                  onSelect={onSend}
                />
              </div>
            ))}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
