"use client";

import type { ReactNode } from "react";

import type { SessionUser } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ShellLayoutProvider, useShellLayout } from "@/components/layout/shell-context";
import { TopNavbar } from "@/components/layout/top-navbar";
import { PageContainer } from "@/components/page-container";

function AppShellInner({ user, children }: { user: SessionUser; children: ReactNode }) {
  const { sidebarCollapsed, isOverviewRoute } = useShellLayout();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="page-shell flex min-h-screen">
        <AppSidebar user={user} collapsed={sidebarCollapsed} />
        <main className={isOverviewRoute ? "min-w-0 flex-1 overflow-hidden" : "min-w-0 flex-1"}>
          <TopNavbar user={user} />
          <PageContainer className={isOverviewRoute ? "h-[calc(100vh-52px)] overflow-hidden" : undefined}>
            {children}
          </PageContainer>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  return (
    <ShellLayoutProvider>
      <AppShellInner user={user}>{children}</AppShellInner>
    </ShellLayoutProvider>
  );
}
