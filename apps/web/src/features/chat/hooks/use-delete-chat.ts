"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export function useDeleteChat(
  activeChatId: string | null,
  activeProjectId: string | null,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("sidebar");

  return useMutation(
    trpc.chat.delete.mutationOptions({
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.listByProject.queryKey(),
        });
        toast.success(t("chat-deleted"));
        if (activeChatId === variables.chatId && activeProjectId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Next.js typed routes don't support dynamic template literals
          router.push(`/projects/${activeProjectId}` as any);
        }
      },
      onError: (error) => {
        toast.error(error.message || t("delete-chat-error"));
      },
    })
  );
}
