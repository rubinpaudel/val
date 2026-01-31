import prisma from "@val/db";

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

export const healthService = {
  async checkDatabase(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "healthy",
        latency: Date.now() - start,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: "unhealthy",
        latency: Date.now() - start,
        error: message,
      };
    }
  },

  async getFullStatus(): Promise<SystemHealth> {
    const database = await this.checkDatabase();

    let status: SystemHealth["status"];
    if (database.status === "healthy") {
      status = "healthy";
    } else {
      status = "unhealthy";
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: { database },
    };
  },
};
