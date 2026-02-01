import { publicProcedure, router } from "../index";
import { ideaRouter } from "../modules/idea";
import { questionRouter } from "../modules/question";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  idea: ideaRouter,
  question: questionRouter,
});

export type AppRouter = typeof appRouter;
