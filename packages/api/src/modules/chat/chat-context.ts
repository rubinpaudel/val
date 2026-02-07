export interface ChatContext {
  buildSystemPrompt(contextId: string, userId: string): Promise<string>;
  validateAccess(contextId: string, userId: string): Promise<boolean>;
  generateTitle?(firstMessage: string): Promise<string>;
}

/** Minimal shape of a Chat record for context resolution */
export interface ChatRecord {
  id: string;
  projectId: string | null;
  [key: string]: unknown;
}

type ContextResolverKey = "projectId"; // extend as new FKs are added

type ContextResolver = {
  key: ContextResolverKey;
  context: ChatContext;
};

const resolvers: ContextResolver[] = [];

export function registerChatContext(key: ContextResolverKey, context: ChatContext) {
  resolvers.push({ key, context });
}

/**
 * Resolves the chat context by inspecting which FK is populated.
 * Returns the context implementation and the ID of the linked resource.
 */
export function resolveChatContext(chat: ChatRecord): { context: ChatContext; contextId: string } {
  for (const resolver of resolvers) {
    const value = chat[resolver.key];
    if (typeof value === "string") {
      return { context: resolver.context, contextId: value };
    }
  }

  throw new Error(`No chat context found for chat ${chat.id}`);
}
