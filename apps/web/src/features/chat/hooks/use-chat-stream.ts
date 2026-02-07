"use client";

import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@val/env/web";
import { trpc } from "@/utils/trpc";
import { useCallback, useRef } from "react";

interface UseChatStreamOptions {
  projectId?: string;
  chatId?: string;
  onChatCreated?: (chatId: string) => void;
}

export function useChatStream({ projectId, chatId, onChatCreated }: UseChatStreamOptions) {
  const queryClient = useQueryClient();
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  // Load existing messages when we have a chatId
  const { data: messagesData } = useQuery({
    ...trpc.chat.getMessages.queryOptions({ chatId: chatId!, limit: 100 }),
    enabled: !!chatId,
  });

  // Create chat mutation
  const createChat = useMutation(
    trpc.chat.create.mutationOptions({
      onSuccess: (data) => {
        chatIdRef.current = data.id;
        onChatCreated?.(data.id);
      },
    }),
  );

  // Convert DB messages to the format useChat expects
  const initialMessages = messagesData?.messages.map((msg) => {
    const parts = msg.parts as Array<{ type: string; text?: string }>;
    const text =
      msg.textContent ||
      parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("") ||
      "";

    return {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: text,
    };
  });

  const chat = useChat({
    id: chatId,
    api: `${env.NEXT_PUBLIC_SERVER_URL}/api/chat/stream`,
    credentials: "include" as RequestCredentials,
    // body is Resolvable<object> — function is resolved at request time
    body: () => ({ chatId: chatIdRef.current }),
    initialMessages,
    onFinish: () => {
      if (chatIdRef.current) {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getMessages.queryKey({ chatId: chatIdRef.current }),
        });
      }
    },
  });

  // Wrap sendMessage to auto-create chat on first message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatIdRef.current) {
        const newChat = await createChat.mutateAsync({
          projectId,
        });
        chatIdRef.current = newChat.id;
      }

      chat.sendMessage({ text });
    },
    [projectId, createChat, chat],
  );

  return {
    messages: chat.messages,
    status: chat.status,
    stop: chat.stop,
    sendMessage,
    isCreatingChat: createChat.isPending,
  };
}
