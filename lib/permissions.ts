export const ROLE_CODES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SALES: "SALES",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  FINANCE: "FINANCE",
  DELIVERY: "DELIVERY",
  VIEWER: "VIEWER"
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const roleLabelMap: Record<RoleCode, string> = {
  SUPER_ADMIN: "超级管理员",
  SALES: "销售",
  PROJECT_MANAGER: "项目经理",
  FINANCE: "财务",
  DELIVERY: "交付",
  VIEWER: "只读"
};

export const permissionModuleLabels = {
  dashboard: "工作台",
  customer: "客户管理",
  lead: "线索管理",
  opportunity: "商机管理",
  project: "项目管理",
  weekly_report: "个人周报",
  project_weekly: "项目周报",
  management_weekly: "管理周报",
  contract: "合同管理",
  contract_approval: "合同审批",
  delivery: "交付管理",
  cost: "成本管理",
  receivable: "回款管理",
  audit_log: "审计日志",
  user: "用户管理",
  role: "角色管理",
  permission: "权限查看"
} as const;

export type PermissionModule = keyof typeof permissionModuleLabels;
export type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "change_status"
  | "convert";

type PermissionDefinitionSeed = {
  module: PermissionModule;
  action: PermissionAction;
  name: string;
  description: string;
};

export type PermissionDefinition = PermissionDefinitionSeed & {
  code: string;
};

function definePermission(module: PermissionModule, action: PermissionAction, name: string, description: string) {
  return {
    code: `${module}:${action}`,
    module,
    action,
    name,
    description
  } satisfies PermissionDefinition;
}

export const permissionDefinitions: PermissionDefinition[] = [
  definePermission("dashboard", "view", "查看工作台", "查看首页概览与经营看板"),
  definePermission("customer", "view", "查看客户", "查看客户信息与详情"),
  definePermission("customer", "create", "新增客户", "创建客户记录"),
  definePermission("customer", "update", "编辑客户", "编辑客户信息"),
  definePermission("customer", "delete", "删除客户", "软删除客户记录"),
  definePermission("lead", "view", "查看线索", "查看线索信息与详情"),
  definePermission("lead", "create", "新增线索", "创建线索记录"),
  definePermission("lead", "update", "编辑线索", "编辑线索信息"),
  definePermission("lead", "delete", "删除线索", "软删除线索记录"),
  definePermission("lead", "convert", "转换线索", "将线索转换为商机"),
  definePermission("opportunity", "view", "查看商机", "查看商机信息与详情"),
  definePermission("opportunity", "create", "新增商机", "创建商机记录"),
  definePermission("opportunity", "update", "编辑商机", "编辑商机信息"),
  definePermission("opportunity", "delete", "删除商机", "软删除商机记录"),
  definePermission("opportunity", "convert", "转换商机", "将商机转换为项目"),
  definePermission("project", "view", "查看项目", "查看项目信息与详情"),
  definePermission("project", "create", "新增项目", "创建项目记录"),
  definePermission("project", "update", "编辑项目", "编辑项目信息"),
  definePermission("project", "delete", "删除项目", "软删除项目记录"),
  definePermission("project", "change_status", "变更项目状态", "更新项目状态流转"),
  definePermission("weekly_report", "view", "查看个人周报", "查看和访问个人周报"),
  definePermission("weekly_report", "create", "创建个人周报", "创建个人周报草稿"),
  definePermission("weekly_report", "update", "编辑个人周报", "保存个人周报草稿"),
  definePermission("weekly_report", "convert", "提交个人周报", "提交个人周报"),
  definePermission("weekly_report", "change_status", "审阅周报", "审阅、退回与催办周报"),
  definePermission("project_weekly", "view", "查看项目周报", "查看项目周报汇总"),
  definePermission("management_weekly", "view", "查看管理周报", "查看管理周汇总"),
  definePermission("contract", "view", "查看合同", "查看合同信息与详情"),
  definePermission("contract", "create", "新增合同", "创建合同记录"),
  definePermission("contract", "update", "编辑合同", "编辑合同信息"),
  definePermission("contract", "delete", "删除合同", "软删除合同记录"),
  definePermission("contract", "change_status", "变更合同状态", "更新合同状态流转"),
  definePermission("contract_approval", "view", "查看合同审批", "查看合同审批列表与详情"),
  definePermission("contract_approval", "create", "发起合同审批", "提交商机转合同审批申请"),
  definePermission("contract_approval", "change_status", "处理合同审批", "审批通过或驳回转合同申请"),
  definePermission("delivery", "view", "查看交付", "查看交付信息与详情"),
  definePermission("delivery", "create", "新增交付", "创建交付记录"),
  definePermission("delivery", "update", "编辑交付", "编辑交付信息"),
  definePermission("delivery", "delete", "删除交付", "软删除交付记录"),
  definePermission("delivery", "change_status", "变更交付状态", "更新交付状态流转"),
  definePermission("cost", "view", "查看成本", "查看成本记录与详情"),
  definePermission("cost", "create", "新增成本", "创建成本记录"),
  definePermission("cost", "update", "编辑成本", "编辑成本记录"),
  definePermission("cost", "delete", "删除成本", "软删除成本记录"),
  definePermission("receivable", "view", "查看回款", "查看回款记录与详情"),
  definePermission("receivable", "create", "新增回款", "创建回款记录"),
  definePermission("receivable", "update", "编辑回款", "编辑回款与到账信息"),
  definePermission("receivable", "delete", "删除回款", "软删除回款记录"),
  definePermission("audit_log", "view", "查看审计日志", "查看系统审计日志"),
  definePermission("user", "view", "查看用户", "查看用户管理页面"),
  definePermission("user", "create", "新增用户", "创建系统用户"),
  definePermission("user", "update", "编辑用户", "编辑用户信息、状态和角色"),
  definePermission("user", "delete", "删除用户", "删除系统用户"),
  definePermission("role", "view", "查看角色", "查看角色列表与详情"),
  definePermission("role", "create", "新增角色", "创建角色并分配权限"),
  definePermission("role", "update", "编辑角色", "编辑角色信息与权限"),
  definePermission("role", "delete", "删除角色", "删除非系统角色"),
  definePermission("permission", "view", "查看权限", "查看权限字典")
];

export const allPermissionCodes = permissionDefinitions.map((item) => item.code);

function codes(...values: string[]) {
  return values;
}

export const defaultRolePermissionCodes: Record<RoleCode, string[]> = {
  SUPER_ADMIN: allPermissionCodes,
  SALES: codes(
    "dashboard:view",
    "customer:view",
    "customer:create",
    "customer:update",
    "lead:view",
    "lead:create",
    "lead:update",
    "lead:convert",
    "opportunity:view",
    "opportunity:create",
    "opportunity:update",
    "opportunity:convert",
    "project:view",
    "weekly_report:view",
    "weekly_report:create",
    "weekly_report:update",
    "weekly_report:convert",
    "contract:view",
    "contract_approval:view",
    "contract_approval:create"
  ),
  PROJECT_MANAGER: codes(
    "dashboard:view",
    "customer:view",
    "opportunity:view",
    "opportunity:update",
    "project:view",
    "project:create",
    "project:update",
    "project:change_status",
    "weekly_report:view",
    "weekly_report:create",
    "weekly_report:update",
    "weekly_report:convert",
    "weekly_report:change_status",
    "project_weekly:view",
    "delivery:view",
    "delivery:create",
    "delivery:update",
    "delivery:change_status",
    "cost:view",
    "cost:create",
    "cost:update",
    "contract:view",
    "receivable:view",
    "contract_approval:view",
    "contract_approval:create"
  ),
  FINANCE: codes(
    "dashboard:view",
    "project:view",
    "project_weekly:view",
    "management_weekly:view",
    "weekly_report:change_status",
    "contract:view",
    "contract:update",
    "contract:change_status",
    "contract_approval:view",
    "contract_approval:change_status",
    "receivable:view",
    "receivable:create",
    "receivable:update",
    "receivable:delete",
    "cost:view"
  ),
  DELIVERY: codes(
    "dashboard:view",
    "project:view",
    "project_weekly:view",
    "weekly_report:view",
    "weekly_report:create",
    "weekly_report:update",
    "weekly_report:convert",
    "delivery:view",
    "delivery:update",
    "delivery:change_status"
  ),
  VIEWER: codes(
    "dashboard:view",
    "customer:view",
    "lead:view",
    "opportunity:view",
    "project:view",
    "weekly_report:view",
    "contract:view",
    "delivery:view",
    "cost:view",
    "receivable:view"
  )
};

export const legacyRoleFallbackMap: Record<string, RoleCode> = {
  ADMIN: ROLE_CODES.SUPER_ADMIN,
  SUPER_ADMIN: ROLE_CODES.SUPER_ADMIN,
  SALES: ROLE_CODES.SALES,
  PM: ROLE_CODES.PROJECT_MANAGER,
  PROJECT_MANAGER: ROLE_CODES.PROJECT_MANAGER,
  FINANCE: ROLE_CODES.FINANCE,
  DELIVERY: ROLE_CODES.DELIVERY,
  VIEWER: ROLE_CODES.VIEWER
};

export function permissionCode(module: PermissionModule, action: PermissionAction) {
  return `${module}:${action}`;
}

export function groupPermissionDefinitions() {
  return Object.entries(permissionModuleLabels).map(([module, label]) => ({
    module,
    label,
    permissions: permissionDefinitions.filter((item) => item.module === module)
  }));
}
