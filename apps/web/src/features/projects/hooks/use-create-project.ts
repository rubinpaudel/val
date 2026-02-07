"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success("Project saved");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save project");
      },
    })
  );
}
