import { registerChatContext } from "../chat-context";
import { elementClarificationContext } from "./element-clarification.context";
import { projectChatContext } from "./project-chat.context";

// Register all chat contexts — more specific first (elementId before projectId)
registerChatContext("elementId", elementClarificationContext);
registerChatContext("projectId", projectChatContext);

export { elementClarificationContext, projectChatContext };
