import dotenv from "dotenv";
import path from "node:path";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // process.env so generate works in CI/build when DATABASE_URL is not set; env() would throw. See:
    // https://www.prisma.io/docs/orm/reference/prisma-config-reference#handling-optional-environment-variables
    url: process.env.DATABASE_URL ?? "",
  },
});
