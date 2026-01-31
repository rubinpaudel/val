import { publicProcedure, router } from "../index";
import { ideaRouter } from "../modules/idea";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  idea: ideaRouter,
});

export type AppRouter = typeof appRouter;
