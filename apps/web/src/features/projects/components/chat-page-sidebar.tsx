"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

interface ChatPageSidebarProps {
  projectId: string;
  activeChatId?: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatPageSidebar({
  projectId,
  activeChatId,
  onSelectChat,
  onNewChat,
}: ChatPageSidebarProps) {
  const { data, isLoading } = useQuery(
    trpc.chat.listByProject.queryOptions({ projectId, limit: 50 }),
  );

  const chats = data?.chats ?? [];

  return (
    <div className="flex flex-col h-full w-64 border-r shrink-0">
      <div className="p-3 border-b">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <Plus className="size-4" />
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-md bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
            <MessageSquare className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No chats yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm truncate rounded-md transition-colors",
                  "hover:bg-accent",
                  activeChatId === chat.id && "bg-accent font-medium",
                )}
              >
                {chat.title || "New conversation"}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
