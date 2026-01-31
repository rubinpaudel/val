"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";

const MAX_LENGTH = 5000;

export default function IdeasPage() {
  const [rawBraindump, setRawBraindump] = useState("");
  const queryClient = useQueryClient();

  const ideas = useQuery(trpc.idea.list.queryOptions({ limit: 20 }));

  const createIdea = useMutation(
    trpc.idea.create.mutationOptions({
      onSuccess: () => {
        setRawBraindump("");
        queryClient.invalidateQueries({ queryKey: trpc.idea.list.queryKey() });
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawBraindump.trim()) return;
    createIdea.mutate({ rawBraindump });
  };

  return (
    <div>
      <h1>My Ideas</h1>

      <form onSubmit={handleSubmit}>
        <textarea
          value={rawBraindump}
          onChange={(e) => setRawBraindump(e.target.value)}
          placeholder="Brain dump your startup idea here..."
          maxLength={MAX_LENGTH}
          rows={6}
        />
        <div>
          {rawBraindump.length}/{MAX_LENGTH}
        </div>
        <Button type="submit" disabled={!rawBraindump.trim() || createIdea.isPending}>
          {createIdea.isPending ? "Saving..." : "Save Idea"}
        </Button>
      </form>

      <div>
        <h2>Saved Ideas</h2>
        {ideas.isLoading && <p>Loading...</p>}
        {ideas.data?.ideas.map((idea) => (
          <div key={idea.id}>
            <h3>{idea.title || idea.rawBraindump.slice(0, 50)}</h3>
            <p>{idea.status}</p>
            <p>{new Date(idea.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
        {ideas.data?.ideas.length === 0 && <p>No ideas yet. Start brainstorming!</p>}
      </div>
    </div>
  );
}
