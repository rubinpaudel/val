import { publicProcedure, router } from "../index";
import { projectRouter } from "../modules/project";
import { questionRouter } from "../modules/question";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  project: projectRouter,
  question: questionRouter,
});

export type AppRouter = typeof appRouter;
