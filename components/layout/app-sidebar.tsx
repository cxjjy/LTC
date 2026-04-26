"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderKanban,
  Gauge,
  HandCoins,
  History,
  LayoutDashboard,
  ListTodo,
  Settings,
  ShieldCheck,
  Target,
  UserCog,
  Users
} from "lucide-react";

import type { SessionUser } from "@/lib/auth";
import { canAccessRecord, type ResourceName } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "工作台",
    items: [
      { href: "/dashboard", label: "首页概览", icon: LayoutDashboard, resource: "dashboard" },
      { href: "/dashboard/projects/overview", label: "项目经营视图", icon: Gauge, resource: "project" }
    ]
  },
  {
    label: "客户与线索",
    items: [
      { href: "/customers", label: "客户管理", icon: Users, resource: "customer" },
      { href: "/leads", label: "线索管理", icon: ListTodo, resource: "lead" },
      { href: "/opportunities", label: "商机管理", icon: Target, resource: "opportunity" }
    ]
  },
  {
    label: "项目与交付",
    items: [
      { href: "/projects", label: "项目管理", icon: FolderKanban, resource: "project" },
      { href: "/deliveries", label: "交付管理", icon: BriefcaseBusiness, resource: "delivery" }
    ]
  },
  {
    label: "周报体系",
    items: [
      { href: "/weekly-reports", label: "个人周报", icon: ClipboardList, resource: "weeklyReport" },
      { href: "/project-weekly", label: "项目周报", icon: ClipboardCheck, resource: "projectWeekly" },
      { href: "/management/weekly-summary", label: "管理汇总", icon: LayoutDashboard, resource: "managementWeekly" }
    ]
  },
      {
        label: "合同与资金",
        items: [
          { href: "/contracts", label: "合同管理", icon: FileText, resource: "contract" },
          { href: "/contract-approvals", label: "合同审批", icon: BadgeCheck, resource: "contractApproval" },
          { href: "/costs", label: "成本管理", icon: CircleDollarSign, resource: "cost" },
          { href: "/receivables", label: "回款管理", icon: HandCoins, resource: "receivable" }
        ]
  },
  {
    label: "系统管理",
    superAdminOnly: true,
    items: [
      { href: "/system/users", label: "用户管理", icon: UserCog, resource: "user" },
      { href: "/system/roles", label: "角色管理", icon: ShieldCheck, resource: "role" },
      { href: "/system/permissions", label: "权限查看", icon: Settings, resource: "permission" },
      { href: "/audit-logs", label: "审计日志", icon: History, resource: "auditLog" }
    ]
  }
];

export function AppSidebar({ user, collapsed }: { user: SessionUser; collapsed: boolean }) {
  const pathname = usePathname();
  const visibleGroups = navGroups
    .filter((group) => !group.superAdminOnly || user.role === "SUPER_ADMIN" || user.roles?.some((item) => item.code === "SUPER_ADMIN"))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessRecord(user, item.resource as ResourceName, "view"))
    }))
    .filter((group) => group.items.length > 0);

  function isItemActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-[var(--color-border-subtle)] bg-[#fbfcfe] transition-[width] duration-200 lg:block",
        collapsed ? "w-[68px]" : "w-[232px]"
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "enterprise-sidebar-brand workspace-header-divider",
            collapsed && "flex justify-center px-0 py-4"
          )}
        >
          <div className={cn("flex items-center gap-3", collapsed && "justify-center gap-0")}>
            <div className="enterprise-sidebar-brand-mark flex items-center justify-center bg-[var(--color-primary)] text-white">
              LTC
            </div>
            <div className={cn("min-w-0", collapsed && "hidden")}>
              <div className="enterprise-sidebar-brand-title truncate text-foreground">LTC项目管理</div>
              <div className="enterprise-sidebar-brand-subtitle truncate">项目全生命周期管理平台</div>
            </div>
          </div>
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")}>
          <div className={cn("space-y-5", collapsed && "space-y-4")}>
            {visibleGroups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                {collapsed ? (
                  <div className="mx-auto h-px w-6 bg-[rgba(203,213,225,0.75)]" />
                ) : (
                  <div className="px-3 py-1 enterprise-sidebar-group-title">{group.label}</div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isItemActive(item.href);

                    return (
                      <Link key={item.href} href={item.href} aria-label={item.label} className="group relative block">
                        <div
                          className={cn(
                            "enterprise-sidebar-item",
                            collapsed && "justify-center px-0",
                            active && "enterprise-sidebar-item-active"
                          )}
                        >
                          <item.icon className="h-[15px] w-[15px] shrink-0 stroke-[1.85]" />
                          <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
                        </div>
                        {collapsed ? (
                          <div className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-[8px] border border-[var(--color-border-subtle)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#374151] shadow-[0_10px_30px_rgba(15,23,42,0.08)] group-hover:block group-focus-within:block">
                            {item.label}
                          </div>
                        ) : null}
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
