"use client";

import { ProjectForm, ProjectGrid } from "@/features/projects";

export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8 h-full">
      <div className="flex flex-col items-center justify-center gap-12 w-full max-w-2xl">
        <h1 className="text-3xl flex items-center gap-2">
          Let's validate that
          <span role="img" aria-label="unicorn">🦄</span>
          <span role="img" aria-label="rainbow">🌈</span>
        </h1>
        <ProjectForm />
      </div>
      <div className="w-full max-w-2xl">
        <ProjectGrid />
      </div>
    </div>
  );
}
