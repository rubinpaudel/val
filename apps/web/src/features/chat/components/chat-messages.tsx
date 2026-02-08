"use client";

import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface ChatMessagesProps {
  messages: UIMessage[];
  className?: string;
}

export function ChatMessages({ messages, className }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {messages.map((message) => {
        const text = message.parts
          .filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text)
          .join("");

        const sources = message.parts.filter(
          (part): part is { type: "source-url"; sourceId: string; url: string; title?: string } =>
            part.type === "source-url",
        );

        // Skip empty messages (e.g. tool-call-only assistant messages)
        if (!text.trim()) return null;

        return (
          <div
            key={message.id}
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
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
