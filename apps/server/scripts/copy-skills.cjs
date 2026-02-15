const { readdirSync, existsSync, mkdirSync, copyFileSync } = require("fs");
const { join } = require("path");

const skillsDir = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "agents",
  "src",
  "skills"
);
const distDir = join(__dirname, "..", "dist");

readdirSync(skillsDir)
  .filter((name) => existsSync(join(skillsDir, name, "SKILL.md")))
  .forEach((name) => {
    mkdirSync(join(distDir, name), { recursive: true });
    copyFileSync(
      join(skillsDir, name, "SKILL.md"),
      join(distDir, name, "SKILL.md")
    );
  });
