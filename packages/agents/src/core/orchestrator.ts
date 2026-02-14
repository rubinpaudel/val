import { streamText, smoothStream, stepCountIs, hasToolCall, type ModelMessage, type StreamTextResult } from "ai";
import type { PostHog } from "posthog-node";
import { resolveAgent } from "../agents/agent-registry";
import { getTracedModel, type TracingOptions } from "./model";
import { composeSkills } from "../skills";

// Ensure agents and skills are registered
import "../agents";
import "../skills";

export interface StreamAgentInput {
  agentName: string;
  contextId: string;
  userId: string;
  messages: ModelMessage[];
  posthogClient?: PostHog | null;
  tracingOptions?: Omit<TracingOptions, "posthogDistinctId">;
  onFinish?: Parameters<typeof streamText>[0]["onFinish"];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function streamAgentResponse(input: StreamAgentInput): Promise<StreamTextResult<any, never>> {
  const agent = resolveAgent(input.agentName);

  let systemPrompt = await agent.buildSystemPrompt(input.contextId, input.userId);
  let tools = agent.getTools ? await agent.getTools(input.contextId, input.userId) : undefined;

  // Auto-compose declared skills: append instructions + merge tools
  if (agent.skills?.length) {
    const composed = composeSkills(...agent.skills);
    systemPrompt += "\n\n" + composed.instructions;
    if (Object.keys(composed.tools).length > 0) {
      tools = { ...tools, ...composed.tools };
    }
  }

  const model = getTracedModel(input.posthogClient, {
    ...input.tracingOptions,
    posthogDistinctId: input.userId,
  });

  const streamOptions: Parameters<typeof streamText>[0] = {
    model,
    system: systemPrompt,
    messages: input.messages,
    onFinish: input.onFinish,
  };

  if (tools) {
    streamOptions.tools = tools;
    const stopConditions = agent.getStopConditions?.() ?? [
      stepCountIs(5),
      hasToolCall("present_choice"),
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    streamOptions.stopWhen = stopConditions as any;
  } else {
    streamOptions.experimental_transform = smoothStream({ chunking: "word" });
  }

  return streamText(streamOptions);
}
