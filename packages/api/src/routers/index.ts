import { protectedProcedure, publicProcedure, router } from "../index";
import { projectRouter } from "../modules/project";

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
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
