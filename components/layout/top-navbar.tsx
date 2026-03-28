"use client";

import { Bell, CalendarDays } from "lucide-react";

import type { SessionUser } from "@/lib/auth";
import { UserMenu } from "@/components/layout/user-menu";

export function TopNavbar({ user }: { user: SessionUser }) {
  const today = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  return (
    <header className="workspace-header-divider flex h-[var(--header-height)] items-center justify-end bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-3 text-muted-foreground md:flex">
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
