"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { trpc } from "@/utils/trpc";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    ...trpc.user.me.queryOptions(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isError) {
      router.replace("/auth/signin");
      return;
    }
    if (!isLoading && data && !data.betaAccess) {
      router.replace("/waitlist");
    }
  }, [data, isLoading, isError, router]);

  if (isLoading || isError || (data && !data.betaAccess)) {
    return <DashboardSkeleton />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
