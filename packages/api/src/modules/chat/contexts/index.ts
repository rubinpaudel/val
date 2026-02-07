import { registerChatContext } from "../chat-context";
import { projectChatContext } from "./project-chat.context";

// Register all chat contexts
registerChatContext("projectId", projectChatContext);

export { projectChatContext };
