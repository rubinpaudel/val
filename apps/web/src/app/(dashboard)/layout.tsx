"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Loader from "@/components/loader";
import { trpc } from "@/utils/trpc";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data, isLoading } = useQuery(trpc.user.me.queryOptions());

  useEffect(() => {
    if (!isLoading && data && !data.betaAccess) {
      router.replace("/waitlist");
    }
  }, [data, isLoading, router]);

  if (isLoading || (data && !data.betaAccess)) {
    return <Loader />;
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
