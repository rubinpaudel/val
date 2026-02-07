import prisma, { type MessageRole } from "@val/db";
import { NotFoundError } from "../../shared/errors/not-found.error";
import { ForbiddenError } from "../../shared/errors/forbidden.error";
import { Logger } from "../../shared/logger";
import type { CreateChatInput, GetChatMessagesInput, ListChatsByProjectInput } from "./chat.schema";

// Ensure context registrations run
import "./contexts";

const logger = new Logger({ service: "chat-service" });

export interface MessageResponse {
  id: string;
  role: MessageRole;
  parts: unknown;
  textContent: string | null;
  createdAt: string;
}

export interface ChatResponse {
  id: string;
  projectId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatWithMessagesResponse extends ChatResponse {
  messages: MessageResponse[];
}

export const chatService = {
  async create(userId: string, input: CreateChatInput): Promise<ChatResponse> {
    // Validate access if a project is linked
    if (input.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!project) {
        throw new ForbiddenError("Cannot create chat for this project");
      }
    }

    const chat = await prisma.chat.create({
      data: {
        userId,
        projectId: input.projectId ?? null,
        title: input.title ?? null,
      },
    });

    logger.info("Chat created", { chatId: chat.id, projectId: input.projectId });

    return {
      id: chat.id,
      projectId: chat.projectId,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    };
  },

  async getById(chatId: string, userId: string): Promise<ChatResponse> {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, deletedAt: null },
    });

    if (!chat) {
      throw new NotFoundError("Chat", chatId);
    }

    return {
      id: chat.id,
      projectId: chat.projectId,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    };
  },

  async getMessages(
    chatId: string,
    userId: string,
    input: GetChatMessagesInput,
  ): Promise<{ messages: MessageResponse[]; nextCursor: string | null }> {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!chat) {
      throw new NotFoundError("Chat", chatId);
    }

    const { limit, cursor } = input;

    const messages = await prisma.message.findMany({
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      messages: items.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
        textContent: msg.textContent,
        createdAt: msg.createdAt.toISOString(),
      })),
      nextCursor,
    };
  },

  async listByProject(
    userId: string,
    input: ListChatsByProjectInput,
  ): Promise<{ chats: ChatResponse[]; nextCursor: string | null }> {
    const { projectId, limit, cursor } = input;

    const chats = await prisma.chat.findMany({
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      where: { userId, projectId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const hasMore = chats.length > limit;
    const items = hasMore ? chats.slice(0, -1) : chats;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      chats: items.map((chat) => ({
        id: chat.id,
        projectId: chat.projectId,
        title: chat.title,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
      })),
      nextCursor,
    };
  },

  async delete(chatId: string, userId: string): Promise<void> {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!chat) {
      throw new NotFoundError("Chat", chatId);
    }

    await prisma.chat.update({
      where: { id: chatId },
      data: { deletedAt: new Date() },
    });

    logger.info("Chat deleted", { chatId });
  },
};
