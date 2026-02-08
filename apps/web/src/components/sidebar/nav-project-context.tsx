"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Plus } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { trpc } from "@/utils/trpc"
import {
  type ProjectStatus,
  statusColors,
} from "@/features/projects/types/project-status"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { ProjectChatList } from "./project-chat-list"

interface NavProjectContextProps {
  projectId: string
  activeChatId: string | null
}

export function NavProjectContext({
  projectId,
  activeChatId,
}: NavProjectContextProps) {
  const t = useTranslations("sidebar")
  const { data: project } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId }),
  )

  const title = project?.title || project?.rawBraindump?.slice(0, 40) || ""
  const status = (project?.status ?? "draft") as ProjectStatus

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm" tooltip={t("all-projects")}>
              <Link href="/">
                <ArrowLeft className="size-4" />
                <span>{t("all-projects")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={title}>
              <Link href={`/projects/${projectId}` as any}>
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    statusColors[status],
                  )}
                />
                <span className="truncate font-medium">{title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("new-chat")}>
              <Link href={`/projects/${projectId}/chat` as any}>
                <Plus className="size-4" />
                <span>{t("new-chat")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarGroupLabel>{t("chats")}</SidebarGroupLabel>

          <ProjectChatList
            projectId={projectId}
            activeChatId={activeChatId}
            variant="flat"
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
