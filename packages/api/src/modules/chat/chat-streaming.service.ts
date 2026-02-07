import { google } from "@ai-sdk/google";
import { streamText, type UIMessage, type StreamTextResult } from "ai";
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

  // Get the last user message to save
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage?.role === "user") {
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

  const conversationMessages = dbMessages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content:
      msg.textContent ||
      (msg.parts as Array<{ type: string; text?: string }>)
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("") ||
      "",
  }));

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: systemPrompt,
    messages: conversationMessages,
    ...(tools && { tools, maxSteps: 5 }),
    onFinish: async ({ text, usage }) => {
      // Save assistant message
      await prisma.message.create({
        data: {
          chatId,
          role: MessageRole.assistant,
          parts: [{ type: "text", text }],
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
