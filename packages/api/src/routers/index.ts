import { protectedProcedure, publicProcedure, router } from "../index";
import { getContainer } from "../container";

const container = getContainer();

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  project: container.controllers.project,
});

export type AppRouter = typeof appRouter;
