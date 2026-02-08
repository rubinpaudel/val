"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useChatStream } from "@/features/chat";
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

  useEffect(() => {
    setActiveChatId(initialChatId);
  }, [initialChatId]);

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

  const { messages, status, stop, sendMessage, isMessagesLoaded } =
    useChatStream({
      projectId,
      chatId: activeChatId,
      onChatCreated: handleChatCreated,
    });

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] -m-4">
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
  );
}
