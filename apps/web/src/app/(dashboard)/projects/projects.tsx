"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";

const MAX_LENGTH = 5000;

export default function ProjectsPage() {
  const [rawBraindump, setRawBraindump] = useState("");
  const queryClient = useQueryClient();

  const projects = useQuery(trpc.project.list.queryOptions({ limit: 20 }));

  const createProject = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: () => {
        setRawBraindump("");
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawBraindump.trim()) return;
    createProject.mutate({ rawBraindump });
  };

  return (
    <div>
      <h1>My Projects</h1>

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
        <Button type="submit" disabled={!rawBraindump.trim() || createProject.isPending}>
          {createProject.isPending ? "Saving..." : "Save Project"}
        </Button>
      </form>

      <div>
        <h2>Saved Projects</h2>
        {projects.isLoading && <p>Loading...</p>}
        {projects.data?.projects.map((project) => (
          <div key={project.id}>
            <h3>{project.title || project.rawBraindump.slice(0, 50)}</h3>
            <p>{project.status}</p>
            <p>{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
        {projects.data?.projects.length === 0 && <p>No projects yet. Start brainstorming!</p>}
      </div>
    </div>
  );
}
