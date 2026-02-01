"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation(
    trpc.idea.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.idea.list.queryKey() });
        toast.success("Idea saved");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save idea");
      },
    })
  );
}
