"use client";

import type { ChatStatus, UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { ChatMessages, ChatInput } from "@/features/chat";

interface ActiveChatViewProps {
  messages: UIMessage[];
  status: ChatStatus;
  onSend: (text: string) => void;
  onStop: () => void;
  isMessagesLoaded: boolean;
}

export function ActiveChatView({
  messages,
  status,
  onSend,
  onStop,
  isMessagesLoaded,
}: ActiveChatViewProps) {
  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4">
        {!isMessagesLoaded ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl w-full">
            <ChatMessages messages={messages} variant="page" />
          </div>
        )}
      </div>
      <div className="">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            onSend={onSend}
            status={status}
            onStop={onStop}
            placeholder="Continue the conversation..."
          />
        </div>
      </div>
    </div>
  );
}
