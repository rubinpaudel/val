"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@val/env/web";
import { trpc } from "@/utils/trpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseChatStreamOptions {
  projectId?: string;
  elementId?: string;
  chatId?: string;
  onChatCreated?: (chatId: string) => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

export function useChatStream({ projectId, elementId, chatId, onChatCreated, onFinish, onError }: UseChatStreamOptions) {
  const queryClient = useQueryClient();
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  // Stable refs for callbacks to avoid recreating the transport
  const onChatCreatedRef = useRef(onChatCreated);
  onChatCreatedRef.current = onChatCreated;

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

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

  // Stable ID for useChat — only updates for navigation (value→value or value→undefined),
  // NOT for creation (undefined→value) which would reset useChat's internal state mid-stream.
  // The server-side chatId is always tracked via chatIdRef in the transport body.
  const prevChatIdRef = useRef(chatId);
  const [useChatId, setUseChatId] = useState(chatId);

  useEffect(() => {
    const prev = prevChatIdRef.current;
    prevChatIdRef.current = chatId;
    if (chatId === prev) return;
    // Only update for navigation (prev was defined) or new-chat (new is undefined).
    // Skip creation (undefined → value) to avoid resetting useChat mid-stream.
    if (prev !== undefined) {
      setUseChatId(chatId);
    }
  }, [chatId]);

  const chatOptions = useMemo(() => {
    const opts: Record<string, unknown> = { transport };
    if (useChatId) opts.id = useChatId;
    return opts;
  }, [transport, useChatId]);

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

      onFinishRef.current?.();
    },
    onError: (error) => {
      // Still invalidate queries on error — answers submitted before the
      // stream failure are persisted in the DB and the parent needs to recount
      if (chatIdRef.current) {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getMessages.queryKey({ chatId: chatIdRef.current }),
        });
      }

      onErrorRef.current?.(error);
    },
  });

  // Load existing messages from DB into the chat when they arrive
  const loadedChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (messagesData && messagesData.messages.length > 0 && chatId && loadedChatIdRef.current !== chatId) {
      loadedChatIdRef.current = chatId;
      // Don't overwrite messages from an active stream session (e.g. after creation)
      if (chat.messages.length > 0) return;
      const mapped = messagesData.messages.map((msg) => {
        const parts = msg.parts as Array<Record<string, unknown>>;

        // Build text from text parts or textContent fallback
        const textFromParts = parts
          .filter((p) => p.type === "text")
          .map((p) => p.text as string)
          .join("");
        const text = msg.textContent || textFromParts || "";

        // Reconstruct full UI parts, preserving tool invocations for generative UI
        const uiParts: Array<Record<string, unknown>> = [];

        // Add text part
        if (text) {
          uiParts.push({ type: "text", text });
        }

        // Preserve non-text parts (tool invocations, sources, etc.)
        for (const p of parts) {
          if (p.type === "tool-invocation") {
            uiParts.push(p);
          } else if (p.type === "source-url") {
            uiParts.push(p);
          }
        }

        // Fallback: ensure at least one text part exists
        if (uiParts.length === 0) {
          uiParts.push({ type: "text", text: "" });
        }

        return {
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: uiParts,
        };
      });
      // Cast needed: DB parts include custom types (tool-invocation, source-url)
      // that don't match strict UIMessagePart but are handled at render time
      chat.setMessages(mapped as unknown as UIMessage[]);
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
    error: chat.error,
    clearError: chat.clearError,
    stop: chat.stop,
    sendMessage,
    clearMessages,
    isMessagesLoaded: !chatId || isMessagesFetched,
  };
}
