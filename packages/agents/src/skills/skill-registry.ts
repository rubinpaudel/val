import type { ToolSet } from "ai";

export interface SkillEntry {
  name: string;
  description: string;
  instructions: string;
  tools?: () => ToolSet;
}

const skills = new Map<string, SkillEntry>();

export function registerSkill(entry: SkillEntry): void {
  skills.set(entry.name, entry);
}

export function loadSkill(name: string): SkillEntry {
  const skill = skills.get(name);
  if (!skill) throw new Error(`Unknown skill: ${name}`);
  return skill;
}

export function composeSkills(
  ...names: string[]
): { instructions: string; tools: ToolSet } {
  const tools: ToolSet = {};
  const parts: string[] = [];

  for (const name of names) {
    const skill = loadSkill(name);
    parts.push(skill.instructions);
    if (skill.tools) {
      Object.assign(tools, skill.tools());
    }
  }

  return { instructions: parts.join("\n\n"), tools };
}
