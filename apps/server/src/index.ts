import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "@val/api/context";
import { appRouter } from "@val/api/routers/index";
import { auth } from "@val/auth";
import { env } from "@val/env/server";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { startResearchWorker, stopResearchWorker } from "./workers";
import { closeRedisConnection } from "./lib/redis";
import { closeQueues } from "./lib/queue";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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


app.get("/", (_req, res) => {
  res.status(200).send("OK");
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
  await closeRedisConnection();

  console.log("Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
