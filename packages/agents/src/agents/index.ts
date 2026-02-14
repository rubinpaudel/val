import { registerAgent } from "./agent-registry";
import { elementClarificationAgent } from "./element-clarification/element-clarification.agent";
import { projectChatAgent } from "./project-chat/project-chat.agent";

// Register all agents — more specific first
registerAgent("element-clarification", elementClarificationAgent);
registerAgent("project-chat", projectChatAgent);

export { elementClarificationAgent, projectChatAgent };
