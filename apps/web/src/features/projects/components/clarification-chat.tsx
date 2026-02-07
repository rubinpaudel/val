"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChatInput, ChatMessages, useChatStream } from "@/features/chat";
import { trpc } from "@/utils/trpc";

const elementTypeLabels: Record<string, string> = {
  who: "Target Audience",
  problem: "Problem",
  solution: "Solution",
  differentiation: "Differentiation",
  monetization: "Monetization",
};

interface ClarificationChatProps {
  element: {
    id: string;
    elementType: string;
    statedValue: string | null;
  };
  projectId: string;
  unansweredCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClarificationChat({
  element,
  projectId,
  unansweredCount,
  open,
  onOpenChange,
}: ClarificationChatProps) {
  const queryClient = useQueryClient();
  const label = elementTypeLabels[element.elementType] ?? element.elementType;

  // Check for an existing chat for this element
  const { data: existingChat } = useQuery({
    ...trpc.chat.getByElement.queryOptions({ elementId: element.id }),
    enabled: open,
  });

  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const effectiveChatId = chatId ?? existingChat?.id ?? undefined;

  const handleFinish = useCallback(() => {
    // Invalidate questions so parent recalculates unanswered counts
    queryClient.invalidateQueries({
      queryKey: trpc.question.list.queryKey({ projectId, includeAnswered: true }),
    });
  }, [queryClient, projectId]);

  const { messages, status, stop, sendMessage, isCreatingChat } = useChatStream({
    projectId,
    elementId: element.id,
    chatId: effectiveChatId,
    onChatCreated: setChatId,
    onFinish: handleFinish,
  });

  const isComplete = unansweredCount === 0 && messages.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg w-full p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base">Clarify: {label}</SheetTitle>
            <Badge variant="secondary" className="text-xs">
              {unansweredCount} left
            </Badge>
          </div>
          {element.statedValue && (
            <SheetDescription className="line-clamp-2">
              {element.statedValue}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4">
          {messages.length === 0 && !isComplete && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Start a conversation with Val to clarify this section
            </div>
          )}
          <ChatMessages messages={messages} />
        </div>

        {/* Completion state */}
        {isComplete && (
          <div className="flex items-center gap-2 mx-4 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="size-5 text-green-600 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Section complete
              </span>
              <span className="text-xs text-green-600 dark:text-green-400">
                All questions for {label} have been answered
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        )}

        {/* Chat input */}
        <div className="p-4 border-t">
          <ChatInput
            onSend={sendMessage}
            status={status}
            onStop={stop}
            placeholder={`Tell Val about your ${label.toLowerCase()}...`}
            disabled={isCreatingChat}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
