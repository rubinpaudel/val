"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export function useStartResearch(projectId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations("research");

  return useMutation(
    trpc.research.start.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.project.getById.queryKey({ id: projectId }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.project.list.queryKey(),
        });
        toast.success(t("started-toast"));
      },
      onError: (error) => {
        toast.error(error.message || t("start-error"));
      },
    }),
  );
}
