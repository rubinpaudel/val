import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@val/env/server";

import { PrismaClient, Prisma } from "../prisma/generated/client";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
export { PrismaClient, Prisma };
export type { PrismaClient as PrismaClientType };

// Re-export enums for use in other packages
export { FrameworkStatus, JobStatus } from "../prisma/generated/client";
