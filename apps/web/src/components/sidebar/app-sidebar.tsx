"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { PanelLeftClose, Plus, Zap } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { trpc } from "@/utils/trpc"
import { NavUser } from "@/components/sidebar/nav-user"
import { Skeleton } from "@/components/ui/skeleton"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  type ProjectStatus,
  statusColors,
} from "@/features/projects/types/project-status"

function SidebarBrand() {
  const { toggleSidebar, state } = useSidebar()
  const [isHovered, setIsHovered] = React.useState(false)
  const isCollapsed = state === "collapsed"

  return (
    <div className="flex items-center justify-between">
      <SidebarMenu className="flex-1">
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className={
              isCollapsed
                ? "group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center cursor-pointer"
                : "group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center pointer-events-none"
            }
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={isCollapsed ? toggleSidebar : undefined}
          >
            {isCollapsed && isHovered ? (
              <PanelLeftClose className="size-4 rotate-180" />
            ) : (
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span role="img" aria-label="unicorn">🦄</span>
              </div>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <button
        onClick={toggleSidebar}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:hidden"
      >
        <PanelLeftClose className="size-4" />
      </button>
    </div>
  )
}

function NavProjects() {
  const projects = useQuery(trpc.project.list.queryOptions({ limit: 50 }))

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Plus className="size-4" />
                <span>Create Project</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
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

            return (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton asChild tooltip={title}>
                  <Link href={`/projects/${project.id}` as any}>
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        statusColors[status]
                      )}
                    />
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects />
      </SidebarContent>
      {session?.user && (
        <SidebarFooter>
          <NavUser user={session.user} />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
