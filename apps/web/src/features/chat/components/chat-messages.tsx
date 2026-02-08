"use client";

import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { ChoiceQuestion } from "./choice-question";

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
}

export function ChatMessages({ messages, onSend, className }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
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

        return (
          <div key={message.id} className="flex flex-col gap-2">
            {/* Text bubble */}
            {text.trim() && (
              <div
                className={cn(
                  "flex w-full",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {text}
                  {sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 whitespace-normal">
                      <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                      <div className="flex flex-col gap-0.5">
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Choice question invocations (generative UI) */}
            {choiceInvocations.map((invocation) => (
              <div key={invocation.toolCallId} className="flex w-full justify-start">
                <div className="max-w-[80%]">
                  <ChoiceQuestion
                    questionText={invocation.data.questionText}
                    options={invocation.data.options}
                    allowMultiple={invocation.data.allowMultiple}
                    disabled={hasFollowingUserMessage}
                    onSelect={onSend}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
