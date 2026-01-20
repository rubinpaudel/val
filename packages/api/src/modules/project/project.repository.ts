import type { PrismaClientType as PrismaClient } from "@val/db";
import type { ILogger } from "../../shared/logger";
import type { Project, CreateProjectInput } from "./project.types";

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Project | null>;
  findManyByUserId(
    userId: string,
    includeDeleted?: boolean
  ): Promise<Project[]>;
  create(data: CreateProjectInput): Promise<Project>;
  softDelete(id: string): Promise<Project>;
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
    includeDeleted: boolean = false
  ): Promise<Project[]> {
    this.logger.debug("Finding projects by userId", {
      userId,
      includeDeleted,
    });

    const projects = await this.prisma.project.findMany({
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

  async softDelete(id: string): Promise<Project> {
    this.logger.debug("Soft deleting project", { projectId: id });

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.info("Project soft deleted", { projectId: id });

    return project;
  }
}
