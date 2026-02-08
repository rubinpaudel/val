"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { trpc } from "@/utils/trpc"
import { ProjectIcon } from "@/components/project-icon"
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
import { Skeleton } from "@/components/ui/skeleton"

interface NavProjectsProps {
  activeProjectId: string | null
}

export function NavProjects({ activeProjectId }: NavProjectsProps) {
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
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={title}>
                  <Link href={`/projects/${project.id}` as any}>
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
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
