import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { ProjectsPage } from "@/features/projects";

export default async function Projects() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <ProjectsPage />;
}
