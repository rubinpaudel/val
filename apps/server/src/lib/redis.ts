import Redis from "ioredis";

let redisClient: Redis | null = null;
let isReconnecting = false;

export function getRedisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

export function getRedisConnection(): Redis {
  if (!redisClient) {
    const redisUrl = getRedisUrl();
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: true,
      retryStrategy(times) {
        // Exponential backoff with max 30 second delay
        const delay = Math.min(times * 500, 30000);
        console.log(`Redis reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
      reconnectOnError(err) {
        // Reconnect on specific errors
        const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
        return targetErrors.some((e) => err.message.includes(e));
      },
    });

    redisClient.on("error", (error) => {
      console.error("Redis connection error:", error.message);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected successfully");
      isReconnecting = false;
    });

    redisClient.on("reconnecting", () => {
      if (!isReconnecting) {
        console.log("Redis reconnecting...");
        isReconnecting = true;
      }
    });

    redisClient.on("close", () => {
      console.log("Redis connection closed");
    });

    redisClient.on("ready", () => {
      console.log("Redis ready to accept commands");
    });
  }

  return redisClient;
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (!redisClient) return false;
    const result = await redisClient.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isReconnecting = false;
    console.log("Redis connection closed");
  }
}

// Export connection options for BullMQ (it needs IORedis options, not instance)
export function getRedisConnectionOptions() {
  const redisUrl = getRedisUrl();
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
    password: url.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}
