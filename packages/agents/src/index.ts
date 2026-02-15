// Core
export { streamAgentResponse, type StreamAgentInput } from "./core/orchestrator";
export { getTracedModel, type TracingOptions } from "./core/model";

// Agent registry
export { registerAgent, resolveAgent } from "./agents/agent-registry";
export type { AgentDefinition } from "./agents/types";

// Skill registry
export { loadSkill, composeSkills, type SkillEntry } from "./skills/skill-registry";
export { readSkillFile, type SkillFile, type SkillMetadata } from "./skills/skill-loader";

// Skills — exported for direct use (e.g., extraction in project.service.ts)
export { extractProjectElements } from "./skills/extraction/extraction.skill";
export { generateQuestions, type QuestionGenerationResult } from "./skills/question-generation/question-generation.skill";

// Research — competitor discovery and intel
export { runCompetitorDiscovery, type ProjectContext, type AddResearchJobFn } from "./skills/competitor-discovery/competitor-discovery.skill";
export { runCompetitorIntel, type CompetitorJobConfig } from "./skills/competitor-intel/competitor-intel.skill";
