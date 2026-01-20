export interface Project {
  id: string;
  userId: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateProjectInput {
  userId: string;
  description: string;
}

export interface PaginationInput {
  limit?: number;
  cursor?: string;
}

export interface ProjectFilter {
  userId?: string;
  includeDeleted?: boolean;
}

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
