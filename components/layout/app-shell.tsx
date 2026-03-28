import type { ReactNode } from "react";

import type { SessionUser } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { PageContainer } from "@/components/page-container";

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="page-shell flex min-h-screen">
        <AppSidebar user={user} />
        <main className="min-w-0 flex-1">
          <TopNavbar user={user} />
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
