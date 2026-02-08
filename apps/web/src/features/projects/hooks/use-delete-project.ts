"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export function useDeleteProject(activeProjectId: string | null) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("sidebar");

  return useMutation(
    trpc.project.delete.mutationOptions({
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: trpc.project.list.queryKey(),
        });
        toast.success(t("project-deleted"));
        if (activeProjectId === variables.id) {
          router.push("/");
        }
      },
      onError: (error) => {
        toast.error(error.message || t("delete-project-error"));
      },
    })
  );
}
