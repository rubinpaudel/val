import type { ILogger } from "../../shared/logger";
import { NotFoundError } from "../../shared/errors/not-found.error";
import type { IProjectRepository } from "./project.repository";
import type {
  Project,
  CreateProjectInput,
  PaginationInput,
  ProjectResponse,
  ProjectListResponse,
} from "./project.types";

export interface IProjectService {
  getProjectById(projectId: string, userId: string): Promise<ProjectResponse>;
  getProjectsByUserId(
    userId: string,
    pagination?: PaginationInput
  ): Promise<ProjectListResponse>;
  createProject(input: CreateProjectInput): Promise<ProjectResponse>;
  deleteProject(projectId: string, userId: string): Promise<void>;
}

export class ProjectService implements IProjectService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly logger: ILogger
  ) {}

  private toResponse(project: Project): ProjectResponse {
    return {
      id: project.id,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async getProjectById(
    projectId: string,
    userId: string
  ): Promise<ProjectResponse> {
    this.logger.debug("Getting project by id", { projectId, userId });

    const project = await this.projectRepository.findByIdAndUserId(
      projectId,
      userId
    );

    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    return this.toResponse(project);
  }

  async getProjectsByUserId(
    userId: string,
    pagination: PaginationInput = {}
  ): Promise<ProjectListResponse> {
    const { limit = 20, cursor } = pagination;

    this.logger.debug("Getting projects for user", { userId, limit, cursor });

    const projects = await this.projectRepository.findManyByUserId(userId, {
      limit,
      cursor,
    });

    const hasMore = projects.length > limit;
    const items = hasMore ? projects.slice(0, -1) : projects;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      projects: items.map((p) => this.toResponse(p)),
      nextCursor,
    };
  }

  async createProject(input: CreateProjectInput): Promise<ProjectResponse> {
    this.logger.debug("Creating project", { userId: input.userId });

    const project = await this.projectRepository.create(input);

    this.logger.info("Project created successfully", {
      projectId: project.id,
      userId: input.userId,
    });

    return this.toResponse(project);
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    this.logger.debug("Deleting project", { projectId, userId });

    const deleted = await this.projectRepository.softDelete(projectId, userId);

    if (!deleted) {
      throw new NotFoundError("Project", projectId);
    }

    this.logger.info("Project deleted successfully", {
      projectId,
      userId,
    });
  }
}
