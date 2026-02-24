"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { MessageSquare, MoreHorizontal, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { trpc } from "@/utils/trpc"
import { useDeleteChat } from "@/features/chat/hooks/use-delete-chat"
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

import { DeleteConfirmDialog } from "./delete-confirm-dialog"

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
  const { data, isLoading } = useQuery({
    ...trpc.chat.listByProject.queryOptions({ projectId, limit: 50 }),
    placeholderData: (previousData) => previousData,
  })
  const deleteChat = useDeleteChat(activeChatId, projectId)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

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
      <>
        <SidebarMenuSub>
          {chats.map((chat) => (
            <SidebarMenuSubItem key={chat.id} className="group/sub-item">
              <ContextMenu>
                <ContextMenuTrigger asChild>
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
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTargetId(chat.id)}
                  >
                    <Trash2 />
                    {t("delete")}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-0.5 right-1 flex size-5 items-center justify-center rounded-md opacity-0 outline-hidden transition-opacity focus-visible:ring-2 group-hover/sub-item:opacity-100 data-[state=open]:opacity-100">
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">More</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTargetId(chat.id)}
                  >
                    <Trash2 />
                    {t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>

        <DeleteConfirmDialog
          open={deleteTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetId(null)
          }}
          title={t("delete-chat")}
          description={t("delete-chat-description")}
          onConfirm={() => {
            if (deleteTargetId) {
              deleteChat.mutate(
                { chatId: deleteTargetId },
                { onSettled: () => setDeleteTargetId(null) },
              )
            }
          }}
          isPending={deleteChat.isPending}
        />
      </>
    )
  }

  return (
    <>
      {chats.map((chat) => (
        <SidebarMenuItem key={chat.id}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
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
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                variant="destructive"
                onClick={() => setDeleteTargetId(chat.id)}
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
                onClick={() => setDeleteTargetId(chat.id)}
              >
                <Trash2 />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      ))}

      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
        title={t("delete-chat")}
        description={t("delete-chat-description")}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteChat.mutate(
              { chatId: deleteTargetId },
              { onSettled: () => setDeleteTargetId(null) },
            )
          }
        }}
        isPending={deleteChat.isPending}
      />
    </>
  )
}
