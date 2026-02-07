import prisma, { type ProjectStatus, type ElementType } from "@val/db";
import { NotFoundError } from "../../shared/errors/not-found.error";
import { extractProjectElements } from "../../services/ai";
import { Logger } from "../../shared/logger";
import type { CreateProjectInput, UpdateProjectInput, ListProjectsInput } from "./project.schema";

const logger = new Logger({ service: "project-service" });

export interface ProjectElementResponse {
  id: string;
  elementType: ElementType;
  statedValue: string | null;
  clarityScore: number | null;
  missingInfo: string[];
  extractionConfidence: number | null;
}

export interface ProjectResponse {
  id: string;
  title: string | null;
  rawBraindump: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  elements?: ProjectElementResponse[];
}

export interface ProjectListResponse {
  projects: ProjectResponse[];
  nextCursor: string | null;
}

interface ProjectWithElements {
  id: string;
  title: string | null;
  rawBraindump: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  elements?: Array<{
    id: string;
    elementType: ElementType;
    statedValue: string | null;
    clarityScore: { toNumber(): number } | null;
    missingInfo: unknown;
    extractionConfidence: { toNumber(): number } | null;
  }>;
}

function toResponse(project: ProjectWithElements): ProjectResponse {
  return {
    id: project.id,
    title: project.title,
    rawBraindump: project.rawBraindump,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    elements: project.elements?.map((el) => ({
      id: el.id,
      elementType: el.elementType,
      statedValue: el.statedValue,
      clarityScore: el.clarityScore?.toNumber() ?? null,
      missingInfo: (el.missingInfo as string[]) || [],
      extractionConfidence: el.extractionConfidence?.toNumber() ?? null,
    })),
  };
}

export const projectService = {
  async create(userId: string, input: CreateProjectInput): Promise<ProjectResponse> {
    const project = await prisma.project.create({
      data: {
        userId,
        rawBraindump: input.rawBraindump,
        title: input.title ?? null,
      },
    });

    // Trigger extraction in background (fire and forget)
    extractProjectElements(project.id, project.rawBraindump).catch((error) => {
      logger.error("Background extraction failed", error instanceof Error ? error : undefined, {
        projectId: project.id,
      });
    });

    return toResponse(project);
  },

  async getById(id: string, userId: string): Promise<ProjectResponse> {
    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        elements: {
          where: { isCurrent: true },
          orderBy: { elementType: "asc" },
        },
      },
    });

    if (!project) {
      throw new NotFoundError("Project", id);
    }

    return toResponse(project);
  },

  async list(userId: string, input: ListProjectsInput): Promise<ProjectListResponse> {
    const { limit, cursor } = input;

    const projects = await prisma.project.findMany({
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const hasMore = projects.length > limit;
    const items = hasMore ? projects.slice(0, -1) : projects;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      projects: items.map(toResponse),
      nextCursor,
    };
  },

  async update(id: string, userId: string, input: UpdateProjectInput): Promise<ProjectResponse> {
    const existing = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError("Project", id);
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(input.rawBraindump !== undefined && { rawBraindump: input.rawBraindump }),
        ...(input.title !== undefined && { title: input.title }),
      },
    });

    return toResponse(project);
  },

  async delete(id: string, userId: string): Promise<void> {
    const existing = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError("Project", id);
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
