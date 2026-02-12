import { google } from "@ai-sdk/google";
import { streamText, smoothStream, stepCountIs, type UIMessage, type StreamTextResult, type ModelMessage, type JSONValue } from "ai";
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

  // Build conversation messages preserving tool-call / tool-result context.
  // DB stores tool invocations as { type: "tool-invocation", toolCallId, toolName, args, result }.
  // AI SDK v6 expects assistant messages with tool-call parts followed by tool-result messages.
  const conversationMessages: ModelMessage[] = [];

  for (const msg of dbMessages) {
    const parts = (msg.parts ?? []) as Array<Record<string, unknown>>;

    if (msg.role === "user") {
      const text =
        msg.textContent ||
        parts.filter((p) => p.type === "text").map((p) => p.text as string).join("") ||
        "";
      if (text.trim().length > 0) {
        conversationMessages.push({ role: "user", content: text });
      }
      continue;
    }

    // Assistant messages: include text + tool-call parts
    const toolInvocations = parts.filter((p) => p.type === "tool-invocation");
    const assistantContent: Array<
      | { type: "text"; text: string }
      | { type: "tool-call"; toolCallId: string; toolName: string; input: unknown }
    > = [];

    const textContent =
      msg.textContent ||
      parts.filter((p) => p.type === "text").map((p) => p.text as string).join("") ||
      "";
    if (textContent.trim()) {
      assistantContent.push({ type: "text", text: textContent });
    }

    for (const ti of toolInvocations) {
      assistantContent.push({
        type: "tool-call",
        toolCallId: ti.toolCallId as string,
        toolName: ti.toolName as string,
        input: ti.args,
      });
    }

    // Skip empty assistant messages (Gemini rejects empty content)
    if (assistantContent.length > 0) {
      conversationMessages.push({ role: "assistant", content: assistantContent });
    }

    // Add tool-result message for each tool invocation
    if (toolInvocations.length > 0) {
      conversationMessages.push({
        role: "tool",
        content: toolInvocations.map((ti) => ({
          type: "tool-result" as const,
          toolCallId: ti.toolCallId as string,
          toolName: ti.toolName as string,
          output: { type: "json" as const, value: (ti.result ?? {}) as JSONValue },
        })),
      });
    }
  }

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

  // Build streamText options — tools and stopWhen must be set directly (not spread)
  // for AI SDK v6 to properly enable multi-step tool execution
  const streamOptions: Parameters<typeof streamText>[0] = {
    model: google("gemini-2.0-flash"),
    system: systemPrompt,
    messages: conversationMessages,
    onFinish: async ({ text, sources, usage, steps, finishReason }) => {
      logger.info("Stream finished", {
        chatId,
        finishReason,
        stepCount: steps?.length ?? 0,
        toolCalls: steps?.flatMap((s) => s.toolCalls?.map((tc) => tc.toolName) ?? []) ?? [],
      });
      // Build parts array from steps to preserve tool invocations (for generative UI)
      const parts: object[] = [];
      if (steps && steps.length > 0) {
        for (const step of steps) {
          // Add tool invocations from this step (e.g. present_choice for generative UI)
          if (step.toolCalls && step.toolCalls.length > 0) {
            for (const tc of step.toolCalls) {
              const tr = step.toolResults?.find(
                (r: { toolCallId: string }) => r.toolCallId === tc.toolCallId,
              );
              // tr.output is ToolResultOutput ({ type: "json", value: rawResult }).
              // Extract the raw value so the frontend can read it directly and
              // the conversation history reconstruction wraps it correctly (once).
              const rawOutput = tr?.output;
              const resultValue =
                rawOutput && typeof rawOutput === "object" && "value" in rawOutput
                  ? (rawOutput as Record<string, unknown>).value
                  : rawOutput;
              parts.push({
                type: "tool-invocation",
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                args: tc.input,
                state: "result",
                result: resultValue,
              });
            }
          }
          // Add text from this step
          if (step.text) {
            parts.push({ type: "text", text: step.text });
          }
        }
      }
      // Fallback if no steps or empty
      if (parts.length === 0 && text) {
        parts.push({ type: "text", text });
      }
      // Add grounding sources
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
  };

  if (tools) {
    streamOptions.tools = tools;
    streamOptions.stopWhen = stepCountIs(5);
  } else {
    streamOptions.experimental_transform = smoothStream({ chunking: "word" });
  }

  const result = streamText(streamOptions);

  return result;
}
