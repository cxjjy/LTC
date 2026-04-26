"use client";

import { Bell, CalendarDays, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import type { SessionUser } from "@/lib/auth";
import { useShellLayout } from "@/components/layout/shell-context";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";

export function TopNavbar({ user }: { user: SessionUser }) {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useShellLayout();
  const today = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  return (
    <header className="enterprise-topbar workspace-header-divider flex items-center justify-between">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="enterprise-topbar-toggle rounded-[8px] px-2 text-[#6b7280] hover:text-foreground"
          onClick={toggleSidebarCollapsed}
          title={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="enterprise-topbar-meta hidden items-center gap-2.5 md:flex">
          <Bell className="h-4 w-4" />
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-[14px] w-[14px]" />
            {today}
          </span>
        </div>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
