import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import { auth } from "@val/auth";
import { fromNodeHeaders } from "better-auth/node";
import type {
  QueueResearchJobFn,
  RemoveResearchJobFn,
} from "./modules/research/research.service";

export async function createContext(opts: CreateExpressContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });
  return {
    session,
    queueResearchJob: opts.req.app.locals
      .queueResearchJob as QueueResearchJobFn,
    removeResearchJob: opts.req.app.locals
      .removeResearchJob as RemoveResearchJobFn,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
