import type { PrismaClientType as PrismaClient } from "@val/db";
import type { ILogger } from "../logger";

export interface HealthStatus {
  status: "healthy" | "unhealthy";
  latency?: number;
  error?: string;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: HealthStatus;
  };
}

export interface IHealthService {
  checkDatabase(): Promise<HealthStatus>;
  getFullStatus(): Promise<SystemHealth>;
}

export class HealthService implements IHealthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger
  ) {}

  async checkDatabase(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "healthy",
        latency: Date.now() - start,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error("Database health check failed", err instanceof Error ? err : undefined);
      return {
        status: "unhealthy",
        latency: Date.now() - start,
        error: message,
      };
    }
  }

  async getFullStatus(): Promise<SystemHealth> {
    const database = await this.checkDatabase();

    // Determine overall status
    const allChecks = [database];
    const unhealthy = allChecks.filter((c) => c.status === "unhealthy");

    let status: SystemHealth["status"];
    if (unhealthy.length === 0) {
      status = "healthy";
    } else if (unhealthy.length === allChecks.length) {
      status = "unhealthy";
    } else {
      status = "degraded";
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database,
      },
    };
  }
}
