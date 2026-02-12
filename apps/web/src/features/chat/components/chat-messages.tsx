"use client";

import type { ChatStatus, UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";
import { MarkdownContent } from "./markdown-content";

export interface PresentChoiceData {
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

/**
 * Returns the active (unanswered) choice data from the last assistant message, or null.
 */
export function getActiveChoiceData(messages: UIMessage[]): (PresentChoiceData & { toolCallId: string }) | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") return null;
    if (msg.role === "assistant") {
      const invocations = extractChoiceInvocations(msg.parts as unknown[]);
      if (invocations.length > 0) {
        const inv = invocations[invocations.length - 1];
        return { toolCallId: inv.toolCallId, ...inv.data };
      }
      return null;
    }
  }
  return null;
}

interface ChatMessagesProps {
  messages: UIMessage[];
  onSend?: (text: string) => void;
  className?: string;
  variant?: "sidebar" | "page";
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  status?: ChatStatus;
}

export function ChatMessages({ messages, onSend, className, variant = "page", scrollContainerRef, status }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const hasStreamedRef = useRef(false);

  if (status === "streaming" || status === "submitted") {
    hasStreamedRef.current = true;
  }

  const checkIfAtBottom = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  }, [scrollContainerRef]);

  // Track scroll position
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;
    container.addEventListener("scroll", checkIfAtBottom);
    return () => container.removeEventListener("scroll", checkIfAtBottom);
  }, [scrollContainerRef, checkIfAtBottom]);

  // Compute a scroll key from the last message's text content so we scroll
  // on every streaming chunk, not just when messages.length changes.
  const lastMessage = messages[messages.length - 1];
  const lastMessageText = lastMessage?.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("") ?? "";

  // When user sends a message (submitted), smooth scroll once
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container || status !== "submitted") return;

    isAtBottomRef.current = true;
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
  }, [messages.length, scrollContainerRef, status]);

  // During streaming, instant scroll to keep up (small increments look smooth naturally)
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (status === "streaming" && isAtBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    } else if (!hasStreamedRef.current) {
      // Initial load — instant scroll, no animation
      container.scrollTop = container.scrollHeight;
    }
  }, [lastMessageText, scrollContainerRef, status]);

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

        // User message — bubble style
        if (message.role === "user") {
          const displayText = text.startsWith("Selected: ") ? text.slice("Selected: ".length) : text;
          return (
            <div key={message.id} className="flex flex-col gap-2">
              {displayText.trim() && (
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
                    {displayText}
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

          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
