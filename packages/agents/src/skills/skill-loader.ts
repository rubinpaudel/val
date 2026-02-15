import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SkillMetadata {
  name: string;
  description: string;
}

export interface SkillFile {
  metadata: SkillMetadata;
  content: string;
}

export function readSkillFile(skillName: string): SkillFile {
  const skillPath = resolve(__dirname, skillName, "SKILL.md");
  const raw = readFileSync(skillPath, "utf-8");
  return parseFrontmatter(raw);
}

function parseFrontmatter(raw: string): SkillFile {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Invalid SKILL.md: missing frontmatter");

  const [, frontmatter = "", body = ""] = match;
  const content = body.trim();

  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const description =
    frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";

  return { metadata: { name, description }, content };
}
