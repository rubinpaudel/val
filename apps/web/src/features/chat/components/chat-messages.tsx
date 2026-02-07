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
      {messages.map((message) => (
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
            {message.parts
              .filter((part): part is { type: "text"; text: string } => part.type === "text")
              .map((part) => part.text)
              .join("")}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
