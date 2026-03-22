"use client";

import { Bell, CalendarDays, CircleHelp, Search } from "lucide-react";

import type { SessionUser } from "@/lib/auth";
import { UserMenu } from "@/components/layout/user-menu";

export function TopNavbar({ user }: { user: SessionUser }) {
  const today = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  return (
    <header className="workspace-header-divider flex h-[var(--header-height)] items-center justify-between bg-white px-6">
      <div className="min-w-0">
        <div className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">LTC项目管理工作台</div>
        <div className="mt-1 text-xs text-muted-foreground">项目与客户一体化管理平台</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-[10px] border border-border bg-[#fbfbfc] px-3 py-2 text-sm text-muted-foreground lg:flex">
          <Search className="h-4 w-4" />
          <span>快速检索项目数据</span>
        </div>
        <div className="hidden items-center gap-3 text-muted-foreground md:flex">
          <CircleHelp className="h-5 w-5" />
          <Bell className="h-5 w-5" />
          <span className="inline-flex items-center gap-1.5 text-sm">
            <CalendarDays className="h-4 w-4" />
            {today}
          </span>
        </div>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
