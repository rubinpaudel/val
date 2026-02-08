"use client"

import * as React from "react"
import { PanelLeftClose } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { NavUser } from "@/components/sidebar/nav-user"
import { NavProjects } from "@/components/sidebar/nav-projects"
import { NavProjectContext } from "@/components/sidebar/nav-project-context"
import { useSidebarNavigation } from "@/components/sidebar/use-sidebar-navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession()
  const { activeProjectId, activeChatId, isProjectContext, isChatRoute } =
    useSidebarNavigation()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        {isProjectContext && activeProjectId ? (
          <NavProjectContext
            projectId={activeProjectId}
            activeChatId={activeChatId}
            isChatRoute={isChatRoute}
          />
        ) : (
          <NavProjects
            activeProjectId={activeProjectId}
          />
        )}
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
