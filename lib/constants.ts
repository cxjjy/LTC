import type {
  ContractStatus,
  CostCategory,
  DeliveryStatus,
  LeadStatus,
  OpportunityStage,
  ProjectStatus,
  ReceivableStatus,
  UserRole
} from "@prisma/client";

export const PAGE_SIZE = 10;
export const SESSION_COOKIE_NAME = "ltc_session";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "管理员",
  SALES: "销售",
  PM: "项目经理",
  DELIVERY: "交付",
  FINANCE: "财务"
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: "新建",
  FOLLOWING: "跟进中",
  CONVERTED: "已转商机",
  CLOSED: "已关闭"
};

export const opportunityStageLabels: Record<OpportunityStage, string> = {
  DISCOVERY: "需求发现",
  REQUIREMENT: "需求确认",
  PROPOSAL: "方案设计",
  QUOTATION: "商务报价",
  NEGOTIATION: "商务谈判",
  WON: "赢单",
  LOST: "丢单"
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  INITIATING: "立项中",
  IN_PROGRESS: "进行中",
  PAUSED: "已暂停",
  COMPLETED: "已完成",
  CANCELED: "已取消"
};

export const contractStatusLabels: Record<ContractStatus, string> = {
  DRAFT: "草稿",
  APPROVING: "审批中",
  EFFECTIVE: "已生效",
  TERMINATED: "已终止"
};

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  NOT_STARTED: "未开始",
  IN_PROGRESS: "进行中",
  ACCEPTED: "已验收",
  DELAYED: "已延期",
  CANCELED: "已取消"
};

export const costCategoryLabels: Record<CostCategory, string> = {
  PROCUREMENT: "采购",
  LABOR: "人工",
  TRAVEL: "差旅",
  OUTSOURCING: "外包",
  OTHER: "其他"
};

export const receivableStatusLabels: Record<ReceivableStatus, string> = {
  PENDING: "待收",
  PARTIAL: "部分回款",
  RECEIVED: "已收款",
  OVERDUE: "已逾期"
};
