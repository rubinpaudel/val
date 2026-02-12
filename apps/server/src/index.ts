import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "@val/api/context";
import { appRouter } from "@val/api/routers/index";
import { healthService } from "@val/api/shared";
import { auth } from "@val/auth";
import { env } from "@val/env/server";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { shutdownPostHog } from "@val/api/services/posthog";
import { handleChatStream } from "./routes/chat";
import { startResearchWorker, stopResearchWorker } from "./workers";
import { closeQueues } from "./lib/queue";

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Chat-Id"],
    credentials: true,
  }),
);

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.use(express.json());

// Chat streaming endpoint (plain HTTP — tRPC doesn't support SSE)
app.post("/api/chat/stream", handleChatStream);

// Basic liveness check
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// Health check endpoints
app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health/ready", async (_req, res) => {
  const health = await healthService.getFullStatus();
  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
  res.status(statusCode).json(health);
});

// Start the research worker
const ENABLE_WORKERS = process.env.ENABLE_WORKERS !== "false";
if (ENABLE_WORKERS) {
  startResearchWorker();
}

const server = app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
  if (ENABLE_WORKERS) {
    console.log("Research worker is running");
  }
});

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down gracefully...");

  server.close(() => {
    console.log("HTTP server closed");
  });

  if (ENABLE_WORKERS) {
    await stopResearchWorker();
  }
  await closeQueues();
  await shutdownPostHog();

  console.log("Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
