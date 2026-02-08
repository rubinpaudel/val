"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useChatStream } from "@/features/chat";
import { trpc } from "@/utils/trpc";
import { ActiveChatView } from "./active-chat-view";
import { ChatPageHeader } from "./chat-page-header";
import { ChatPageSidebar } from "./chat-page-sidebar";
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

  const handleChatCreated = useCallback(
    (newChatId: string) => {
      setActiveChatId(newChatId);
      router.replace(
        `/projects/${projectId}/chat/${newChatId}` as never,
        { scroll: false },
      );
      queryClient.invalidateQueries({
        queryKey: trpc.chat.listByProject.queryKey({ projectId }),
      });
    },
    [router, projectId, queryClient],
  );

  const { messages, status, stop, sendMessage, clearMessages, isMessagesLoaded } =
    useChatStream({
      projectId,
      chatId: activeChatId,
      onChatCreated: handleChatCreated,
    });

  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (status === "streaming" || status === "submitted") {
        stop();
      }
      setActiveChatId(chatId);
      router.replace(
        `/projects/${projectId}/chat/${chatId}` as never,
        { scroll: false },
      );
    },
    [router, projectId, status, stop],
  );

  const handleNewChat = useCallback(() => {
    if (status === "streaming" || status === "submitted") {
      stop();
    }
    setActiveChatId(undefined);
    clearMessages();
    router.replace(`/projects/${projectId}/chat` as never, { scroll: false });
  }, [router, projectId, status, stop, clearMessages]);

  return (
    <div className="flex h-[calc(100vh-2rem)] -m-4">
      <ChatPageSidebar
        projectId={projectId}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <ChatPageHeader projectId={projectId} />
        {activeChatId ? (
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
    </div>
  );
}
