import { publicProcedure, router } from "../index";
import { chatRouter } from "../modules/chat";
import { projectRouter } from "../modules/project";
import { questionRouter } from "../modules/question";
import { researchRouter } from "../modules/research";
import { userRouter } from "../modules/user";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  project: projectRouter,
  question: questionRouter,
  chat: chatRouter,
  user: userRouter,
  research: researchRouter,
});

export type AppRouter = typeof appRouter;
