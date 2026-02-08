import prisma from "@val/db";

import { protectedProcedure, router } from "../../index";

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { betaAccess: true },
    });

    return user;
  }),
});
