"use client";

import { useState } from "react";
import { useChatStream, ChatMessages, ChatInput } from "@/features/chat";

interface ProjectChatProps {
  projectId: string;
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const [chatId, setChatId] = useState<string>();

  const { messages, status, stop, sendMessage } = useChatStream({
    projectId,
    chatId,
    onChatCreated: setChatId,
  });

  return (
    <div className="flex flex-col gap-4">
      <ChatMessages messages={messages} />
      <ChatInput
        onSend={sendMessage}
        status={status}
        onStop={stop}
        placeholder="Chat with your project..."
      />
    </div>
  );
}
