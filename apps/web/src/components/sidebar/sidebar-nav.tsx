"use client";

import type { LucideIcon } from "lucide-react";
import { LayoutDashboardIcon, LightbulbIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { useSidebar } from "./sidebar-context";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  { label: "Projects", href: "/projects", icon: LightbulbIcon },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  return (
    <nav className="px-3 py-2">
      <ul className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href as any}
                className={cn(
                  "flex items-center gap-3 rounded-none px-2 py-2 text-sm transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive &&
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  isCollapsed && "justify-center px-0"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="size-4 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
