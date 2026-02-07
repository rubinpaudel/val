"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export function useCreateProject() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success("Project saved");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Next.js typed routes don't support dynamic template literals
        router.push(`/projects/${data.id}` as any);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save project");
      },
    })
  );
}
