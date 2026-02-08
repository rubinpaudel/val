"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"

export function useSidebarNavigation() {
  const pathname = usePathname()

  return useMemo(() => {
    const projectMatch = pathname.match(/^\/projects\/([^/]+)/)
    const chatMatch = pathname.match(/^\/projects\/[^/]+\/chat\/([^/]+)/)

    const isChatRoute = /^\/projects\/[^/]+\/chat/.test(pathname)

    return {
      activeProjectId: projectMatch?.[1] ?? null,
      activeChatId: chatMatch?.[1] ?? null,
      isProjectContext: !!projectMatch,
      isChatRoute,
    }
  }, [pathname])
}
