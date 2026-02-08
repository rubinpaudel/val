"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { MessageSquare } from "lucide-react"
import { useTranslations } from "next-intl"

import { trpc } from "@/utils/trpc"
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

interface ProjectChatListProps {
  projectId: string
  activeChatId: string | null
  variant: "nested" | "flat"
}

export function ProjectChatList({
  projectId,
  activeChatId,
  variant,
}: ProjectChatListProps) {
  const t = useTranslations("sidebar")
  const { data, isLoading } = useQuery(
    trpc.chat.listByProject.queryOptions({ projectId, limit: 50 }),
  )

  const chats = data?.chats ?? []

  if (isLoading) {
    return variant === "nested" ? (
      <SidebarMenuSub>
        {[1, 2].map((i) => (
          <SidebarMenuSubItem key={i}>
            <SidebarMenuSkeleton />
          </SidebarMenuSubItem>
        ))}
      </SidebarMenuSub>
    ) : (
      <>
        {[1, 2].map((i) => (
          <SidebarMenuItem key={i}>
            <SidebarMenuSkeleton />
          </SidebarMenuItem>
        ))}
      </>
    )
  }

  if (chats.length === 0) {
    return variant === "nested" ? (
      <SidebarMenuSub>
        <li className="px-2 py-1.5">
          <span className="text-xs text-muted-foreground">
            {t("no-chats")}
          </span>
        </li>
      </SidebarMenuSub>
    ) : (
      <SidebarMenuItem>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <MessageSquare className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {t("no-chats")}
          </span>
        </div>
      </SidebarMenuItem>
    )
  }

  if (variant === "nested") {
    return (
      <SidebarMenuSub>
        {chats.map((chat) => (
          <SidebarMenuSubItem key={chat.id}>
            <SidebarMenuSubButton
              asChild
              isActive={activeChatId === chat.id}
            >
              <Link href={`/projects/${projectId}/chat/${chat.id}` as any}>
                <span className="truncate">
                  {chat.title || "New conversation"}
                </span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
      </SidebarMenuSub>
    )
  }

  return (
    <>
      {chats.map((chat) => (
        <SidebarMenuItem key={chat.id}>
          <SidebarMenuButton
            asChild
            isActive={activeChatId === chat.id}
            tooltip={chat.title || "New conversation"}
          >
            <Link href={`/projects/${projectId}/chat/${chat.id}` as any}>
              <MessageSquare className="size-4" />
              <span className="truncate">
                {chat.title || "New conversation"}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  )
}
