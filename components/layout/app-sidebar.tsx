"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderKanban,
  Gauge,
  HandCoins,
  LayoutList,
  Target,
  Users
} from "lucide-react";

import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "工作台",
    items: [{ href: "/dashboard", label: "首页概览", icon: Gauge }]
  },
  {
    label: "客户与线索",
    items: [
      { href: "/customers", label: "客户管理", icon: Users },
      { href: "/leads", label: "线索管理", icon: LayoutList },
      { href: "/opportunities", label: "商机管理", icon: Target }
    ]
  },
  {
    label: "项目与交付",
    items: [
      { href: "/projects", label: "项目管理", icon: FolderKanban }
    ]
  },
  {
    label: "合同与资金",
    items: [
      { href: "/contracts", label: "合同管理", icon: FileText },
      { href: "/deliveries", label: "交付管理", icon: BriefcaseBusiness },
      { href: "/costs", label: "成本管理", icon: CircleDollarSign },
      { href: "/receivables", label: "回款管理", icon: HandCoins }
    ]
  },
  {
    label: "系统管理",
    items: [{ href: "/audit-logs", label: "审计日志", icon: ClipboardList }]
  }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[var(--sidebar-width)] shrink-0 border-r border-[rgba(229,231,235,0.92)] bg-[#fbfbfc] lg:block">
      <div className="flex h-full flex-col">
        <div className="workspace-header-divider px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-primary)] text-[13px] font-semibold tracking-[-0.02em] text-white">
              LTC
            </div>
            <div className="min-w-0">
              <div className="truncate text-[18px] font-semibold tracking-[-0.03em] text-foreground">LTC项目管理</div>
              <div className="mt-0.5 text-xs text-muted-foreground">项目全生命周期管理平台</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <div className="px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            "relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-[#4b5563] transition-colors duration-150 hover:bg-[var(--color-hover)] hover:text-foreground",
                            active && "bg-[rgba(59,130,246,0.10)] text-[rgb(29,78,216)]"
                          )}
                        >
                          {active ? (
                            <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[var(--color-primary)]" />
                          ) : null}
                          <item.icon className="h-[17px] w-[17px] stroke-[1.8]" />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
