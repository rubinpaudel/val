import { google } from "@ai-sdk/google";
import { streamText, smoothStream, type UIMessage, type StreamTextResult } from "ai";
import prisma, { MessageRole } from "@val/db";
import { Logger } from "../../shared/logger";
import { resolveChatContext } from "./chat-context";
import { NotFoundError } from "../../shared/errors/not-found.error";

// Ensure context registrations run
import "./contexts";

const logger = new Logger({ service: "chat-streaming" });

export interface StreamChatInput {
  chatId: string;
  messages: UIMessage[];
  init?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function streamChatResponse(userId: string, input: StreamChatInput): Promise<StreamTextResult<any, never>> {
  const { chatId, messages } = input;

  // Verify chat ownership
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId, deletedAt: null },
  });

  if (!chat) {
    throw new NotFoundError("Chat", chatId);
  }

  // Resolve context from relations
  const { context, contextId } = resolveChatContext(chat);
  const systemPrompt = await context.buildSystemPrompt(contextId, userId);

  // Get tools if the context provides them (e.g. clarification chat)
  const tools = context.getTools ? await context.getTools(contextId, userId) : undefined;

  // Get the last user message to save (skip in init mode — trigger message is not stored)
  const lastUserMessage = messages[messages.length - 1];
  if (!input.init && lastUserMessage?.role === "user") {
    const textContent =
      lastUserMessage.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || null;

    await prisma.message.create({
      data: {
        id: lastUserMessage.id,
        chatId,
        role: MessageRole.user,
        parts: (lastUserMessage.parts ?? []) as object[],
        textContent,
      },
    });
  }

  // Load all messages from DB for full context
  const dbMessages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  const conversationMessages: Array<{ role: "user" | "assistant"; content: string }> = dbMessages
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content:
        msg.textContent ||
        (msg.parts as Array<{ type: string; text?: string }>)
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ||
        "",
    }))
    // Filter out messages with empty content (e.g. tool-call-only assistant messages)
    // Gemini rejects requests containing messages with empty parts.
    .filter((msg) => msg.content.trim().length > 0);

  // In init mode the AI needs at least one user message to respond to.
  // Generate a server-side trigger so the client doesn't need to send one.
  if (conversationMessages.length === 0) {
    if (input.init) {
      conversationMessages.push({ role: "user", content: "Begin the conversation." });
    } else if (lastUserMessage?.role === "user") {
      const triggerText =
        lastUserMessage.parts
          ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("") || "Begin the conversation.";
      conversationMessages.push({ role: "user", content: triggerText });
    }
  }

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: systemPrompt,
    messages: conversationMessages,
    ...(tools && { tools, maxSteps: 5 }),
    experimental_transform: smoothStream({ chunking: "word" }),
    onFinish: async ({ text, sources, usage }) => {
      // Build parts array: text + any grounding sources for persistence
      const parts: object[] = [{ type: "text", text }];
      if (sources && sources.length > 0) {
        for (const source of sources) {
          if ("url" in source && source.url) {
            parts.push({
              type: "source-url",
              sourceId: source.id,
              url: source.url,
              title: "title" in source ? source.title : undefined,
            });
          }
        }
      }

      // Save assistant message
      await prisma.message.create({
        data: {
          chatId,
          role: MessageRole.assistant,
          parts,
          textContent: text,
          promptTokens: usage.inputTokens ?? null,
          completionTokens: usage.outputTokens ?? null,
          totalTokens: usage.totalTokens ?? null,
        },
      });

      // Auto-generate title on first exchange
      if (!chat.title && context.generateTitle) {
        const messageCount = await prisma.message.count({ where: { chatId } });
        if (messageCount <= 2) {
          const firstUserText =
            dbMessages.find((m) => m.role === MessageRole.user)?.textContent || "";
          const title = await context.generateTitle(firstUserText);
          await prisma.chat.update({
            where: { id: chatId },
            data: { title },
          });
        }
      }

      logger.info("Chat response completed", {
        chatId,
        tokens: usage.totalTokens,
      });
    },
  });

  return result;
}
