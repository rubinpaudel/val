"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@val/env/web";
import { trpc } from "@/utils/trpc";
import { useCallback, useEffect, useMemo, useRef } from "react";

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

  // Stable refs for callbacks to avoid recreating the transport
  const onChatCreatedRef = useRef(onChatCreated);
  onChatCreatedRef.current = onChatCreated;

  // Load existing messages when we have a chatId
  const { data: messagesData, isFetched: isMessagesFetched } = useQuery({
    ...trpc.chat.getMessages.queryOptions({ chatId: chatId!, limit: 100 }),
    enabled: !!chatId,
  });

  // Init mode: when true, backend generates the trigger message server-side
  const initModeRef = useRef(false);

  // Pending chatId from the X-Chat-Id header — propagated to React state in onFinish
  // to avoid re-initializing useChat mid-stream
  const pendingChatIdRef = useRef<string | null>(null);

  // Create transport with custom fetch to intercept X-Chat-Id response header.
  // When no chatId exists, sends elementId so the backend can create the chat inline.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${env.NEXT_PUBLIC_SERVER_URL}/api/chat/stream`,
        credentials: "include",
        body: () => ({
          chatId: chatIdRef.current,
          elementId: chatIdRef.current ? undefined : elementId,
          projectId: chatIdRef.current ? undefined : projectId,
          init: initModeRef.current,
        }),
        fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
          const response = await globalThis.fetch(input, init);

          const newChatId = response.headers.get("X-Chat-Id");
          if (newChatId && newChatId !== chatIdRef.current) {
            // Update ref immediately so subsequent transport calls use the correct chatId
            chatIdRef.current = newChatId;
            // Defer React state update to onFinish to avoid disrupting useChat mid-stream
            pendingChatIdRef.current = newChatId;
          }

          return response;
        }) as typeof fetch,
      }),
    [elementId, projectId],
  );

  // Do NOT pass `id` to useChat when chatId is undefined.
  // AI SDK recreates the Chat instance on every render when id is undefined
  // because it generates a random internal id that never matches `undefined`.
  // The actual chatId is sent to the server via the transport body.
  const chatOptions = useMemo(() => {
    const opts: Record<string, unknown> = { transport };
    if (chatId) opts.id = chatId;
    return opts;
  }, [transport, chatId]);

  const chat = useChat({
    ...chatOptions,
    onFinish: () => {
      // Propagate chatId to React state after stream completes
      if (pendingChatIdRef.current) {
        const newId = pendingChatIdRef.current;
        pendingChatIdRef.current = null;
        onChatCreatedRef.current?.(newId);
      }

      if (chatIdRef.current) {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getMessages.queryKey({ chatId: chatIdRef.current }),
        });
      }

      // Invalidate chat list so sidebar picks up new chats and updated titles
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.listByProject.queryKey({ projectId }),
        });
      }

      onFinish?.();
    },
  });

  // Load existing messages from DB into the chat when they arrive
  const loadedChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (messagesData && messagesData.messages.length > 0 && chatId && loadedChatIdRef.current !== chatId) {
      loadedChatIdRef.current = chatId;
      const mapped = messagesData.messages.map((msg) => {
        const parts = msg.parts as Array<{ type: string; text?: string }>;
        const text =
          msg.textContent ||
          parts.filter((p) => p.type === "text").map((p) => p.text).join("") ||
          "";
        return {
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: [{ type: "text" as const, text }],
        };
      });
      chat.setMessages(mapped);
    }
  }, [messagesData, chatId, chat]);

  const chatSendRef = useRef(chat.sendMessage);
  chatSendRef.current = chat.sendMessage;

  const sendMessage = useCallback(
    (text: string, options?: { init?: boolean }) => {
      initModeRef.current = options?.init ?? false;
      chatSendRef.current({ text });
    },
    [],
  );

  const clearMessages = useCallback(() => {
    chat.setMessages([]);
    loadedChatIdRef.current = null;
  }, [chat]);

  return {
    messages: chat.messages,
    status: chat.status,
    stop: chat.stop,
    sendMessage,
    clearMessages,
    isMessagesLoaded: !chatId || isMessagesFetched,
  };
}
