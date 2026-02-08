"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Plus } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { trpc } from "@/utils/trpc"
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
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

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
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          statusColors[status],
                        )}
                      />
                      <span className="truncate">{title}</span>
                      <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
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
    </SidebarGroup>
  )
}
