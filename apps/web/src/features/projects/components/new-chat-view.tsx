"use client";

import type { ChatStatus } from "ai";
import { ChatInput } from "@/features/chat";

interface NewChatViewProps {
  onSend: (text: string) => void;
  status: ChatStatus;
  onStop: () => void;
}

export function NewChatView({ onSend, status, onStop }: NewChatViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-xl">
        <h2 className="text-2xl">
          Chat with Val about your project
        </h2>
        <ChatInput
          onSend={onSend}
          status={status}
          onStop={onStop}
          placeholder="Ask Val anything about your project..."
          className="w-full"
        />
      </div>
    </div>
  );
}
