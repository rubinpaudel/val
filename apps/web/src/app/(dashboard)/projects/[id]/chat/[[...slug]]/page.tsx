import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { ProjectChatPage } from "@/features/projects/components/project-chat-page";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string; slug?: string[] }>;
}) {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const { id, slug } = await params;
  const chatId = slug?.[0];

  return <ProjectChatPage projectId={id} initialChatId={chatId} />;
}
