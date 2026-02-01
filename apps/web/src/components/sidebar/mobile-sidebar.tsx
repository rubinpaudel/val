"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { MenuIcon, PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar-context";
import { SidebarIdeaList } from "./sidebar-idea-list";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";

export function MobileSidebar() {
  const { isMobileOpen, setIsMobileOpen } = useSidebar();

  return (
    <DialogPrimitive.Root open={isMobileOpen} onOpenChange={setIsMobileOpen}>
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-3 md:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setIsMobileOpen(true)}
        >
          <MenuIcon className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>

        <Link href="/" className="text-lg font-semibold">
          Val
        </Link>

        <Link href="/">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <PlusIcon className="size-5" />
            <span className="sr-only">New idea</span>
          </Button>
        </Link>
      </div>

      {/* Mobile drawer */}
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            className={cn(
              "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
              "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
              "transition-opacity duration-200"
            )}
          />
          <DialogPrimitive.Popup
            className={cn(
              "fixed top-0 left-0 bottom-0 z-50 w-64 bg-sidebar text-sidebar-foreground",
              "data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full",
              "transition-transform duration-200 ease-out"
            )}
          >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
              <Link
                href="/"
                className="text-lg font-semibold"
                onClick={() => setIsMobileOpen(false)}
              >
                Val
              </Link>
              <DialogPrimitive.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-sidebar-foreground hover:bg-sidebar-accent"
                  />
                }
              >
                <XIcon className="size-4" />
                <span className="sr-only">Close menu</span>
              </DialogPrimitive.Close>
            </div>

            {/* New Idea Button */}
            <div className="px-3 py-3">
              <Link href="/" onClick={() => setIsMobileOpen(false)}>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-sidebar-border bg-sidebar hover:bg-sidebar-accent"
                >
                  <PlusIcon className="size-4" />
                  <span>New Idea</span>
                </Button>
              </Link>
            </div>

            {/* Navigation */}
            <div onClick={() => setIsMobileOpen(false)}>
              <SidebarNav />
            </div>

            {/* Ideas Section */}
            <div className="flex-1 overflow-hidden">
              <div className="px-3 py-2">
                <span className="text-xs font-medium text-sidebar-foreground/60">
                  My Ideas
                </span>
              </div>
              <div onClick={() => setIsMobileOpen(false)}>
                <SidebarIdeaList />
              </div>
            </div>

            {/* User Menu */}
            <SidebarUserMenu />
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      {/* Spacer for mobile header */}
      <div className="h-14 md:hidden" />
    </DialogPrimitive.Root>
  );
}
