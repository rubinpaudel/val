"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const tEl = useTranslations("elements");
  const tClarify = useTranslations("clarification");
  const label = tEl.has(element.elementType) ? tEl(element.elementType) : element.elementType;

  // Check for an existing chat for this element
  const { data: existingChat, isFetched: isExistingChatFetched } = useQuery({
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

  const { messages, status, stop, sendMessage, isMessagesLoaded } = useChatStream({
    projectId,
    elementId: element.id,
    chatId: effectiveChatId,
    onChatCreated: setChatId,
    onFinish: handleFinish,
  });

  // Track whether init has been triggered for this element (ref to avoid re-renders)
  const initTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    initTriggeredRef.current = null;
  }, [element.id]);

  // Auto-init: when sheet opens and no existing chat, trigger immediately.
  // The streaming endpoint creates the chat inline and starts the AI response.
  useEffect(() => {
    if (
      open &&
      isExistingChatFetched &&
      isMessagesLoaded &&
      !existingChat &&
      !effectiveChatId &&
      initTriggeredRef.current !== element.id &&
      status === "ready"
    ) {
      initTriggeredRef.current = element.id;
      sendMessage("Begin", { init: true });
    }
  }, [open, isExistingChatFetched, isMessagesLoaded, existingChat, effectiveChatId, element.id, status, sendMessage]);

  // Hide the init trigger message from display
  const isInitChat = initTriggeredRef.current === element.id;
  const displayMessages = isInitChat
    ? messages.filter((_, i) => !(i === 0 && messages[0]?.role === "user"))
    : messages;

  const isComplete = unansweredCount === 0 && displayMessages.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg w-full p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base">{tClarify("clarify-label", { label })}</SheetTitle>
            <Badge variant="secondary" className="text-xs">
              {tClarify("questions-left", { count: unansweredCount })}
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
          {displayMessages.length === 0 && !isComplete && status !== "ready" && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin mr-2" />
              {tClarify("val-is-typing")}
            </div>
          )}
          <ChatMessages messages={displayMessages} onSend={sendMessage} variant="sidebar" />
        </div>

        {/* Completion footer or chat input */}
        {isComplete ? (
          <div className="flex items-center justify-end p-4 border-t">
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <CheckCircle2 className="size-4 mr-1.5" />
              {tClarify("done")}
            </Button>
          </div>
        ) : (
          <div className="p-4 border-t">
            <ChatInput
              onSend={sendMessage}
              status={status}
              onStop={stop}
              placeholder={tClarify("tell-val-about", { label: label.toLowerCase() })}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
