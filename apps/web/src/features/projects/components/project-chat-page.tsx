"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useChatStream, consumePendingMessage } from "@/features/chat";
import { trpc } from "@/utils/trpc";
import { ActiveChatView } from "./active-chat-view";
import { ChatPageHeader } from "./chat-page-header";
import { NewChatView } from "./new-chat-view";

interface ProjectChatPageProps {
  projectId: string;
  initialChatId?: string;
}

export function ProjectChatPage({
  projectId,
  initialChatId,
}: ProjectChatPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | undefined>(
    initialChatId,
  );
  const [pendingText] = useState(() => consumePendingMessage(projectId));
  const hasSentPending = useRef(false);

  useEffect(() => {
    setActiveChatId(initialChatId);
  }, [initialChatId]);

  const handleChatCreated = useCallback(
    (newChatId: string) => {
      setActiveChatId(newChatId);
      // Update URL without triggering re-render
      window.history.replaceState(
        null,
        "",
        `/projects/${projectId}/chat/${newChatId}`,
      );
      // Note: queryClient invalidation is already handled in useChatStream's onFinish
    },
    [projectId],
  );

  const { messages, status, stop, sendMessage, isMessagesLoaded } =
    useChatStream({
      projectId,
      chatId: activeChatId,
      onChatCreated: handleChatCreated,
    });

  // Auto-send the pending message from the project detail page
  useEffect(() => {
    if (pendingText && !hasSentPending.current) {
      hasSentPending.current = true;
      sendMessage(pendingText);
    }
  }, [pendingText, sendMessage]);

  const showActiveView =
    !!activeChatId || messages.length > 0 || !!pendingText;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] -m-4">
      <ChatPageHeader projectId={projectId} chatId={activeChatId} />
      {showActiveView ? (
        <ActiveChatView
          messages={messages}
          status={status}
          onSend={sendMessage}
          onStop={stop}
          isMessagesLoaded={isMessagesLoaded}
        />
      ) : (
        <NewChatView
          onSend={sendMessage}
          status={status}
          onStop={stop}
        />
      )}
    </div>
  );
}
