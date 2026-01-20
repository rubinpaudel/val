import type { PrismaClientType as PrismaClient } from "@val/db";
import type { ILogger } from "../../shared/logger";
import type { Project, CreateProjectInput, PaginationInput } from "./project.types";

export interface FindManyOptions extends PaginationInput {
  includeDeleted?: boolean;
}

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Project | null>;
  findManyByUserId(userId: string, options?: FindManyOptions): Promise<Project[]>;
  create(data: CreateProjectInput): Promise<Project>;
  softDelete(id: string, userId: string): Promise<Project | null>;
}

export class ProjectRepository implements IProjectRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger
  ) {}

  async findById(id: string): Promise<Project | null> {
    this.logger.debug("Finding project by id", { projectId: id });

    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    return project;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Project | null> {
    this.logger.debug("Finding project by id and userId", {
      projectId: id,
      userId,
    });

    const project = await this.prisma.project.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    return project;
  }

  async findManyByUserId(
    userId: string,
    options: FindManyOptions = {}
  ): Promise<Project[]> {
    const { limit = 20, cursor, includeDeleted = false } = options;

    this.logger.debug("Finding projects by userId", {
      userId,
      limit,
      cursor,
      includeDeleted,
    });

    const projects = await this.prisma.project.findMany({
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      where: {
        userId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return projects;
  }

  async create(data: CreateProjectInput): Promise<Project> {
    this.logger.debug("Creating project", { userId: data.userId });

    const project = await this.prisma.project.create({
      data: {
        userId: data.userId,
        description: data.description,
      },
    });

    this.logger.info("Project created", {
      projectId: project.id,
      userId: data.userId,
    });

    return project;
  }

  async softDelete(id: string, userId: string): Promise<Project | null> {
    this.logger.debug("Soft deleting project", { projectId: id, userId });

    const result = await this.prisma.project.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      this.logger.warn("Soft delete failed - project not found or not owned by user", {
        projectId: id,
        userId,
      });
      return null;
    }

    this.logger.info("Project soft deleted", { projectId: id, userId });

    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    return project;
  }
}
