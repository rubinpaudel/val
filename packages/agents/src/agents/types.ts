import type { ToolSet, StopCondition } from "ai";

export interface AgentDefinition {
  /** Skills this agent composes (loaded automatically by orchestrator) */
  skills?: string[];

  /** Build the system prompt from context data */
  buildSystemPrompt(contextId: string, userId: string): Promise<string>;

  /** Validate that the user has access to this context */
  validateAccess(contextId: string, userId: string): Promise<boolean>;

  /** Return tool set for this agent, if any */
  getTools?(contextId: string, userId: string): Promise<ToolSet>;

  /** Optionally generate a title for the conversation */
  generateTitle?(firstMessage: string): Promise<string>;

  /** Optional custom stop conditions for multi-step tool execution */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStopConditions?(): StopCondition<any>[];
}
