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
  LockKeyhole,
  Target,
  Users
} from "lucide-react";

import type { SessionUser } from "@/lib/auth";
import { canAccessRecord, type ResourceName } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "工作台",
    items: [{ href: "/dashboard", label: "首页概览", icon: Gauge, resource: "dashboard" }]
  },
  {
    label: "客户与线索",
    items: [
      { href: "/customers", label: "客户管理", icon: Users, resource: "customer" },
      { href: "/leads", label: "线索管理", icon: LayoutList, resource: "lead" },
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
      { href: "/project-weekly", label: "项目周报", icon: ClipboardList, resource: "projectWeekly" },
      { href: "/management/weekly-summary", label: "管理汇总", icon: ClipboardList, resource: "managementWeekly" }
    ]
  },
      {
        label: "合同与资金",
        items: [
          { href: "/contracts", label: "合同管理", icon: FileText, resource: "contract" },
          { href: "/contract-approvals", label: "合同审批", icon: ClipboardList, resource: "contractApproval" },
          { href: "/costs", label: "成本管理", icon: CircleDollarSign, resource: "cost" },
          { href: "/receivables", label: "回款管理", icon: HandCoins, resource: "receivable" }
        ]
  },
  {
    label: "系统管理",
    superAdminOnly: true,
    items: [
      { href: "/system/users", label: "用户管理", icon: Users, resource: "user" },
      { href: "/system/roles", label: "角色管理", icon: LockKeyhole, resource: "role" },
      { href: "/system/permissions", label: "权限查看", icon: ClipboardList, resource: "permission" },
      { href: "/audit-logs", label: "审计日志", icon: ClipboardList, resource: "auditLog" }
    ]
  }
];

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const visibleGroups = navGroups
    .filter((group) => !group.superAdminOnly || user.role === "SUPER_ADMIN" || user.roles?.some((item) => item.code === "SUPER_ADMIN"))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessRecord(user, item.resource as ResourceName, "view"))
    }))
    .filter((group) => group.items.length > 0);

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
            {visibleGroups.map((group) => (
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
