import { publicProcedure, router } from "../index";
import { chatRouter } from "../modules/chat";
import { projectRouter } from "../modules/project";
import { questionRouter } from "../modules/question";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  project: projectRouter,
  question: questionRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
