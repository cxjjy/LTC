import type { ResourceName } from "@/lib/rbac";

type DeleteCopy = {
  moduleLabel: string;
  warning?: string;
  listPath: string;
};

const deleteCopyMap: Record<ResourceName, DeleteCopy> = {
  dashboard: {
    moduleLabel: "工作台",
    listPath: "/dashboard"
  },
  customer: {
    moduleLabel: "客户",
    warning: "删除客户将影响其关联的线索、商机、项目和合同入口，请确认是否继续。",
    listPath: "/customers"
  },
  lead: {
    moduleLabel: "线索",
    warning: "若线索已转为商机，将无法直接删除。",
    listPath: "/leads"
  },
  opportunity: {
    moduleLabel: "商机",
    warning: "删除商机前请确认其未进入项目阶段。",
    listPath: "/opportunities"
  },
  project: {
    moduleLabel: "项目",
    warning: "删除项目将影响其关联合同、交付、成本或回款的查看，请确认是否继续。",
    listPath: "/projects"
  },
  weeklyReport: {
    moduleLabel: "个人周报",
    listPath: "/weekly-reports"
  },
  projectWeekly: {
    moduleLabel: "项目周报",
    listPath: "/project-weekly"
  },
  managementWeekly: {
    moduleLabel: "管理周报",
    listPath: "/management/weekly-summary"
  },
  contract: {
    moduleLabel: "合同",
    warning: "删除合同后，相关回款记录可能失去默认入口，请确认是否继续。",
    listPath: "/contracts"
  },
  contractApproval: {
    moduleLabel: "合同审批",
    listPath: "/contract-approvals"
  },
  delivery: {
    moduleLabel: "交付",
    warning: "删除交付后将从默认工作清单中移除，请确认是否继续。",
    listPath: "/deliveries"
  },
  cost: {
    moduleLabel: "成本",
    warning: "删除成本记录后将影响项目成本汇总，请确认是否继续。",
    listPath: "/costs"
  },
  receivable: {
    moduleLabel: "回款",
    warning: "删除回款记录将影响合同与项目资金视图，请确认是否继续。",
    listPath: "/receivables"
  },
  user: {
    moduleLabel: "用户",
    warning: "删除用户后将无法继续登录系统，请确认是否继续。",
    listPath: "/system/users"
  },
  role: {
    moduleLabel: "角色",
    warning: "删除角色后将不再可被分配，请确认是否继续。",
    listPath: "/system/roles"
  },
  permission: {
    moduleLabel: "权限",
    listPath: "/system/permissions"
  },
  auditLog: {
    moduleLabel: "审计日志",
    listPath: "/audit-logs"
  }
};

export function getDeleteCopy(resource: ResourceName) {
  return deleteCopyMap[resource];
}
