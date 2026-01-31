import { NotFoundError } from "../../shared/errors/not-found.error";
import {
  projectRepository,
  type Project,
  type CreateProjectInput,
  type PaginationInput,
} from "./project.repository";

export interface ProjectResponse {
  id: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  projects: ProjectResponse[];
  nextCursor: string | null;
}

function toResponse(project: Project): ProjectResponse {
  return {
    id: project.id,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export const projectService = {
  async getProjectById(projectId: string, userId: string): Promise<ProjectResponse> {
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) throw new NotFoundError("Project", projectId);
    return toResponse(project);
  },

  async getProjectsByUserId(
    userId: string,
    pagination: PaginationInput = {}
  ): Promise<ProjectListResponse> {
    const { limit = 20, cursor } = pagination;
    const projects = await projectRepository.findManyByUserId(userId, { limit, cursor });

    const hasMore = projects.length > limit;
    const items = hasMore ? projects.slice(0, -1) : projects;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      projects: items.map(toResponse),
      nextCursor,
    };
  },

  async createProject(input: CreateProjectInput): Promise<ProjectResponse> {
    const project = await projectRepository.create(input);
    return toResponse(project);
  },

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const deleted = await projectRepository.softDelete(projectId, userId);
    if (!deleted) throw new NotFoundError("Project", projectId);
  },
};
