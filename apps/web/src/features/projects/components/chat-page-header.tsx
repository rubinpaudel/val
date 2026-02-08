"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/utils/trpc";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ChatPageHeaderProps {
  projectId: string;
  chatId?: string;
}

export function ChatPageHeader({ projectId, chatId }: ChatPageHeaderProps) {
  const t = useTranslations("projects");
  const { data: project } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId }),
  );

  const { data: chat } = useQuery({
    ...trpc.chat.getById.queryOptions({ chatId: chatId! }),
    enabled: !!chatId,
  });

  const chatTitle = chat?.title || t("chat-label");

  return (
    <div className="px-4 py-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/projects/${projectId}` as never}>
                {project?.title || t("untitled-project")}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{chatTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
