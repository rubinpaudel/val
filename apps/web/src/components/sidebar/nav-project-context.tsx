"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { trpc } from "@/utils/trpc"
import {
  type ProjectStatus,
  statusColors,
} from "@/features/projects/types/project-status"
import { useDeleteProject } from "@/features/projects/hooks/use-delete-project"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { DeleteConfirmDialog } from "./delete-confirm-dialog"
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
  const deleteProject = useDeleteProject(projectId)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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
            <ContextMenu>
              <ContextMenuTrigger asChild>
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
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 />
                  {t("delete")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 />
                  {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t("delete-project")}
        description={t("delete-project-description")}
        onConfirm={() => {
          deleteProject.mutate(
            { id: projectId },
            { onSettled: () => setShowDeleteDialog(false) },
          )
        }}
        isPending={deleteProject.isPending}
      />
    </SidebarGroup>
  )
}
