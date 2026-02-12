import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";
import { identifyUser } from "./services/posthog";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }

  identifyUser({
    userId: ctx.session.user.id,
    name: ctx.session.user.name,
    email: ctx.session.user.email,
  });

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
