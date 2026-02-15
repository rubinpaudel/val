import type { AgentDefinition } from "./types";

const agents = new Map<string, AgentDefinition>();

export function registerAgent(name: string, agent: AgentDefinition): void {
  agents.set(name, agent);
}

export function resolveAgent(name: string): AgentDefinition {
  const agent = agents.get(name);
  if (!agent) {
    throw new Error(`No agent registered with name: ${name}`);
  }
  return agent;
}
