import { ProjectChatPage } from "@/features/projects/components/project-chat-page";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string; slug?: string[] }>;
}) {
  const { id, slug } = await params;
  const chatId = slug?.[0];

  return <ProjectChatPage projectId={id} initialChatId={chatId} />;
}
