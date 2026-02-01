"use client";

import { IdeaForm } from "./_components/idea-form";
import { IdeaGrid } from "./_components/idea-grid";

export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8 h-full">
      <div className="flex flex-col items-center justify-center gap-4 w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Your Ideas</h1>
        <IdeaForm />
      </div>
      <div className="w-full max-w-2xl">
        <IdeaGrid />
      </div>
    </div>
  );
}
