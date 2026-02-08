"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { trpc } from "@/utils/trpc"
import { ProjectIcon } from "@/components/project-icon"
import {
  type ProjectStatus,
  statusColors,
} from "@/features/projects/types/project-status"
import { useDeleteProject } from "@/features/projects/hooks/use-delete-project"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { Skeleton } from "@/components/ui/skeleton"

import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import { ProjectChatList } from "./project-chat-list"

interface NavProjectsProps {
  activeProjectId: string | null
  activeChatId: string | null
}

export function NavProjects({
  activeProjectId,
  activeChatId,
}: NavProjectsProps) {
  const t = useTranslations("sidebar")
  const projects = useQuery(trpc.project.list.queryOptions({ limit: 50 }))
  const deleteProject = useDeleteProject(activeProjectId)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Plus className="size-4" />
                <span>{t("create-project")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarGroupLabel>{t("projects")}</SidebarGroupLabel>
          {projects.isLoading &&
            [1, 2, 3].map((i) => (
              <SidebarMenuItem key={i}>
                <Skeleton className="h-8 w-full rounded-md" />
              </SidebarMenuItem>
            ))}
          {projects.data?.projects.map((project) => {
            const title =
              project.title || project.rawBraindump.slice(0, 40)
            const status = project.status as ProjectStatus
            const isActive = activeProjectId === project.id

            return (
              <Collapsible
                key={project.id}
                asChild
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={title}>
                          <span className="relative shrink-0">
                            <ProjectIcon icon={project.icon} className="size-4 text-muted-foreground" />
                            <span
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full border border-sidebar-background",
                                statusColors[status],
                              )}
                            />
                          </span>
                          <span className="truncate">{title}</span>
                          <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTargetId(project.id)}
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
                        onClick={() => setDeleteTargetId(project.id)}
                      >
                        <Trash2 />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <CollapsibleContent>
                    <ProjectChatList
                      projectId={project.id}
                      activeChatId={activeChatId}
                      variant="nested"
                    />
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>

      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
        title={t("delete-project")}
        description={t("delete-project-description")}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteProject.mutate(
              { id: deleteTargetId },
              { onSettled: () => setDeleteTargetId(null) },
            )
          }
        }}
        isPending={deleteProject.isPending}
      />
    </SidebarGroup>
  )
}
