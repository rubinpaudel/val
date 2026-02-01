"use client";

import { ChevronUpIcon, LogOutIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar-context";

export function SidebarUserMenu() {
  const { isCollapsed } = useSidebar();
  const { setTheme, theme } = useTheme();
  const router = useRouter();

  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/auth/signin");
  };

  if (isPending) {
    return (
      <div className="border-t border-sidebar-border p-3">
        <Skeleton className={cn("h-10", isCollapsed ? "w-10" : "w-full")} />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : session.user.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="border-t border-sidebar-border">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className={cn(
                "h-auto w-full justify-start gap-3 px-2 py-2 hover:bg-sidebar-accent",
                isCollapsed && "justify-center px-0"
              )}
            />
          }
        >
          {/* Avatar */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="size-8 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          {!isCollapsed && (
            <>
              <div className="flex flex-1 flex-col items-start text-left">
                <span className="text-sm font-medium">
                  {session.user.name || "User"}
                </span>
                <span className="text-xs text-sidebar-foreground/60">
                  Free plan
                </span>
              </div>
              <ChevronUpIcon className="size-4 text-sidebar-foreground/60" />
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" sideOffset={8}>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <SettingsIcon />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {theme === "dark" ? <MoonIcon /> : <SunIcon />}
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <SunIcon />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <MoonIcon />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
