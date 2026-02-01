"use client";

import { cva } from "class-variance-authority";
import { PanelLeftIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar-context";
import { SidebarIdeaList } from "./sidebar-idea-list";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";

const sidebarVariants = cva(
  "flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 ease-in-out",
  {
    variants: {
      state: {
        expanded: "w-64",
        collapsed: "w-16",
      },
    },
    defaultVariants: {
      state: "expanded",
    },
  }
);

export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        sidebarVariants({ state: isCollapsed ? "collapsed" : "expanded" }),
        "hidden md:flex"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-3">
        {!isCollapsed && (
          <Link href="/" className="text-lg font-semibold">
            Val
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent",
            isCollapsed && "mx-auto"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeftIcon className="size-3" />
        </Button>
      </div>

      {/* New Idea Button */}
      <div className="px-3 py-3">
        <Link href="/">
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 border-sidebar-border bg-sidebar hover:bg-sidebar-accent",
              isCollapsed && "justify-center px-0"
            )}
          >
            <PlusIcon className="size-4" />
            {!isCollapsed && <span>New Idea</span>}
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <SidebarNav />

      {/* Ideas Section */}
      <div className="flex-1 overflow-hidden">
        {!isCollapsed && (
          <div className="px-3 py-2">
            <span className="text-xs font-medium text-sidebar-foreground/60">
              My Ideas
            </span>
          </div>
        )}
        <SidebarIdeaList />
      </div>

      {/* User Menu */}
      <SidebarUserMenu />
    </aside>
  );
}
