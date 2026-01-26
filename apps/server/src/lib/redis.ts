// Redis connection options for BullMQ
// BullMQ manages its own connections, so we just provide config

export function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
    password: url.password || undefined,
    maxRetriesPerRequest: null as null, // Required for BullMQ
  };
}
