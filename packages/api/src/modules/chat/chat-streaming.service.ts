import { type UIMessage, type StreamTextResult, type ModelMessage, type JSONValue } from "ai";
import { streamAgentResponse, resolveAgent } from "@val/agents";
import prisma, { MessageRole } from "@val/db";
import { Logger } from "../../shared/logger";
import { getPostHogClient } from "../../services/posthog";
import { NotFoundError } from "../../shared/errors/not-found.error";

const logger = new Logger({ service: "chat-streaming" });

export interface StreamChatInput {
  chatId: string;
  messages: UIMessage[];
  init?: boolean;
}

/**
 * Resolves the agent name and context ID from a chat's foreign key fields.
 */
function resolveAgentName(chat: { elementId: string | null; projectId: string | null }): { agentName: string; contextId: string } {
  if (chat.elementId) return { agentName: "element-clarification", contextId: chat.elementId };
  if (chat.projectId) return { agentName: "project-chat", contextId: chat.projectId };
  throw new Error(`No agent found for chat`);
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

  // Resolve agent from relations
  const { agentName, contextId } = resolveAgentName(chat);
  const agent = resolveAgent(agentName);

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

    // Assistant messages: reconstruct multi-step flows faithfully.
    // Parts are stored in step order: [tool-invocations..., text..., ...]
    // We emit separate assistant/tool messages per segment to preserve the
    // sequential flow the model expects (tools before text).
    type Segment =
      | { kind: "tools"; tools: Array<Record<string, unknown>> }
      | { kind: "text"; text: string };

    const segments: Segment[] = [];

    for (const part of parts) {
      if (part.type === "tool-invocation") {
        const last = segments[segments.length - 1];
        if (last && last.kind === "tools") {
          last.tools.push(part);
        } else {
          segments.push({ kind: "tools", tools: [part] });
        }
      } else if (part.type === "text") {
        const t = (part.text as string) || "";
        if (!t.trim()) continue;
        const last = segments[segments.length - 1];
        if (last && last.kind === "text") {
          last.text += t;
        } else {
          segments.push({ kind: "text", text: t });
        }
      }
    }

    for (const segment of segments) {
      if (segment.kind === "tools") {
        conversationMessages.push({
          role: "assistant",
          content: segment.tools.map((ti) => ({
            type: "tool-call" as const,
            toolCallId: ti.toolCallId as string,
            toolName: ti.toolName as string,
            input: ti.args,
          })),
        });
        conversationMessages.push({
          role: "tool",
          content: segment.tools.map((ti) => ({
            type: "tool-result" as const,
            toolCallId: ti.toolCallId as string,
            toolName: ti.toolName as string,
            output: { type: "json" as const, value: (ti.result ?? {}) as JSONValue },
          })),
        });
      } else if (segment.kind === "text" && segment.text.trim()) {
        conversationMessages.push({
          role: "assistant",
          content: [{ type: "text", text: segment.text }],
        });
      }
    }
  }

  // Gemini requires conversations to start with a user role message.
  // In init-mode chats the trigger message is not persisted, so the first
  // DB message may be an assistant message — prepend a synthetic user turn.
  if (conversationMessages.length > 0 && conversationMessages[0]!.role !== "user") {
    conversationMessages.unshift({ role: "user", content: "Begin the conversation." });
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

  // Delegate to the agents package for AI orchestration
  const result = await streamAgentResponse({
    agentName,
    contextId,
    userId,
    messages: conversationMessages,
    posthogClient: getPostHogClient(),
    tracingOptions: { posthogProperties: { chatId, type: "chat" } },
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
          textContent:
            steps && steps.length > 0
              ? steps.map((s) => s.text).filter(Boolean).join("\n")
              : text,
          promptTokens: usage.inputTokens ?? null,
          completionTokens: usage.outputTokens ?? null,
          totalTokens: usage.totalTokens ?? null,
        },
      });

      // Auto-generate title on first exchange
      if (!chat.title && agent.generateTitle) {
        const messageCount = await prisma.message.count({ where: { chatId } });
        if (messageCount <= 2) {
          const firstUserText =
            dbMessages.find((m) => m.role === MessageRole.user)?.textContent || "";
          const title = await agent.generateTitle(firstUserText);
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
