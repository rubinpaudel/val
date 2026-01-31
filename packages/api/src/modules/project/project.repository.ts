import prisma from "@val/db";

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

export interface FindManyOptions extends PaginationInput {
  includeDeleted?: boolean;
}

export const projectRepository = {
  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({ where: { id } });
  },

  async findByIdAndUserId(id: string, userId: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
    });
  },

  async findManyByUserId(userId: string, options: FindManyOptions = {}): Promise<Project[]> {
    const { limit = 20, cursor, includeDeleted = false } = options;

    return prisma.project.findMany({
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      where: {
        userId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: CreateProjectInput): Promise<Project> {
    return prisma.project.create({
      data: { userId: data.userId, description: data.description },
    });
  },

  async softDelete(id: string, userId: string): Promise<Project | null> {
    const result = await prisma.project.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) return null;

    return prisma.project.findUnique({ where: { id } });
  },
};
