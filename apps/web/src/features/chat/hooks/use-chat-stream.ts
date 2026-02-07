"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@val/env/web";
import { trpc } from "@/utils/trpc";
import { useCallback, useMemo, useRef } from "react";

interface UseChatStreamOptions {
  projectId?: string;
  elementId?: string;
  chatId?: string;
  onChatCreated?: (chatId: string) => void;
  onFinish?: () => void;
}

export function useChatStream({ projectId, elementId, chatId, onChatCreated, onFinish }: UseChatStreamOptions) {
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
      parts: [{ type: "text" as const, text }],
    };
  });

  // Create transport — body is Resolvable so the function is called at request time
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${env.NEXT_PUBLIC_SERVER_URL}/api/chat/stream`,
        credentials: "include",
        body: () => ({ chatId: chatIdRef.current }),
      }),
    [],
  );

  const chat = useChat({
    id: chatId,
    transport,
    messages: initialMessages,
    onFinish: () => {
      if (chatIdRef.current) {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getMessages.queryKey({ chatId: chatIdRef.current }),
        });
      }
      onFinish?.();
    },
  });

  // Wrap sendMessage to auto-create chat on first message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatIdRef.current) {
        const newChat = await createChat.mutateAsync({
          projectId,
          elementId,
        });
        chatIdRef.current = newChat.id;
      }

      chat.sendMessage({ text });
    },
    [projectId, elementId, createChat, chat],
  );

  return {
    messages: chat.messages,
    status: chat.status,
    stop: chat.stop,
    sendMessage,
    isCreatingChat: createChat.isPending,
  };
}
