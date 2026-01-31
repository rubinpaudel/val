import prisma, { type IdeaStatus } from "@val/db";
import { NotFoundError } from "../../shared/errors/not-found.error";
import type { CreateIdeaInput, UpdateIdeaInput, ListIdeasInput } from "./idea.schema";

export interface IdeaResponse {
  id: string;
  title: string | null;
  rawBraindump: string;
  status: IdeaStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IdeaListResponse {
  ideas: IdeaResponse[];
  nextCursor: string | null;
}

function toResponse(idea: {
  id: string;
  title: string | null;
  rawBraindump: string;
  status: IdeaStatus;
  createdAt: Date;
  updatedAt: Date;
}): IdeaResponse {
  return {
    id: idea.id,
    title: idea.title,
    rawBraindump: idea.rawBraindump,
    status: idea.status,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
  };
}

export const ideaService = {
  async create(userId: string, input: CreateIdeaInput): Promise<IdeaResponse> {
    const idea = await prisma.idea.create({
      data: {
        userId,
        rawBraindump: input.rawBraindump,
        title: input.title ?? null,
      },
    });

    return toResponse(idea);
  },

  async getById(id: string, userId: string): Promise<IdeaResponse> {
    const idea = await prisma.idea.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!idea) {
      throw new NotFoundError("Idea", id);
    }

    return toResponse(idea);
  },

  async list(userId: string, input: ListIdeasInput): Promise<IdeaListResponse> {
    const { limit, cursor } = input;

    const ideas = await prisma.idea.findMany({
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const hasMore = ideas.length > limit;
    const items = hasMore ? ideas.slice(0, -1) : ideas;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      ideas: items.map(toResponse),
      nextCursor,
    };
  },

  async update(id: string, userId: string, input: UpdateIdeaInput): Promise<IdeaResponse> {
    const existing = await prisma.idea.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError("Idea", id);
    }

    const idea = await prisma.idea.update({
      where: { id },
      data: {
        ...(input.rawBraindump !== undefined && { rawBraindump: input.rawBraindump }),
        ...(input.title !== undefined && { title: input.title }),
      },
    });

    return toResponse(idea);
  },

  async delete(id: string, userId: string): Promise<void> {
    const existing = await prisma.idea.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError("Idea", id);
    }

    await prisma.idea.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
