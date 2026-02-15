"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
  Plus,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { trpc } from "@/utils/trpc"
import { ProjectIcon } from "@/components/project-icon"
import {
  type ProjectStatus,
  statusColors,
} from "@/features/projects/types/project-status"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

import { ProjectChatList } from "./project-chat-list"

interface NavProjectsCollapsibleProps {
  activeProjectId: string | null
  activeChatId: string | null
}

export function NavProjectsCollapsible({
  activeProjectId,
  activeChatId,
}: NavProjectsCollapsibleProps) {
  const t = useTranslations("sidebar")
  const projects = useQuery(trpc.project.list.queryOptions({ limit: 50 }))

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
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={title}>
                      <span className="relative shrink-0">
                        <ProjectIcon
                          icon={project.icon}
                          className="size-4 text-muted-foreground"
                        />
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full border border-sidebar-background",
                            statusColors[status],
                          )}
                        />
                      </span>
                      <span className="truncate">{title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* Dashboard link */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href={`/projects/${project.id}` as any}>
                            <LayoutDashboard className="size-4" />
                            <span>{t("dashboard")}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      {/* Chats label */}
                      <li className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="size-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {t("chats")}
                          </span>
                        </div>
                      </li>

                      {/* Chats list (nested variant) */}
                      <ProjectChatList
                        projectId={project.id}
                        activeChatId={activeChatId}
                        variant="nested"
                      />

                      {/* New Chat button */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href={`/projects/${project.id}/chat` as any}>
                            <Plus className="size-4" />
                            <span>{t("new-chat")}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
