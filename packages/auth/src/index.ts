import { expo } from "@better-auth/expo";
import prisma from "@val/db";
import { env } from "@val/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [env.CORS_ORIGIN, "mybettertapp://", "exp://"],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      // Only set domain in production; localhost won't receive cookies with domain ".tryval.app"
      ...(process.env.NODE_ENV === "production" && { domain: ".tryval.app" }),
    },
  },
  plugins: [expo()],
});
