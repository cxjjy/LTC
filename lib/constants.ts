import type {
  ContractStatus,
  CostCategory,
  DeliveryStatus,
  LeadStatus,
  OpportunityStage,
  ProjectStatus,
  ReceivableStatus
} from "@prisma/client";
import { roleLabelMap, type RoleCode } from "@/lib/permissions";

export const PAGE_SIZE = 10;
export const SESSION_COOKIE_NAME = "ltc_session";

export const roleLabels: Record<RoleCode, string> = roleLabelMap;

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

export const weeklyReportStatusLabels = {
  draft: "草稿",
  submitted: "已提交",
  overdue: "逾期待补",
  reviewed: "已审阅",
  returned: "已退回"
} as const;

export const weeklyReportItemTypeLabels = {
  done: "本周完成",
  plan: "下周计划",
  risk: "风险/阻塞"
} as const;

export const weeklyReportPriorityLabels = {
  low: "低",
  medium: "中",
  high: "高"
} as const;

export const weeklyReportSuggestionSourceLabels = {
  last_week_plan: "来自上周未完成计划",
  active_project: "来自本周项目活动",
  ongoing_risk: "来自持续风险",
  coordination: "来自协同事项",
  project_update: "来自项目更新",
  opportunity_update: "来自商机推进"
} as const;

export const weeklyReportSuggestionStatusLabels = {
  pending: "待处理",
  applied: "已采用",
  ignored: "已忽略"
} as const;

export const weeklyTrafficLightLabels = {
  green: "绿灯",
  yellow: "黄灯",
  red: "红灯"
} as const;

export const weeklyTaskTypeLabels = {
  risk: "风险任务",
  collaboration: "协同任务"
} as const;

export const weeklyTaskStatusLabels = {
  open: "待处理",
  processing: "处理中",
  done: "已完成"
} as const;

export const contractStatusLabels: Record<string, string> = {
  ACTIVE: "生效",
  TERMINATED: "已终止"
};

export const bizAttachmentTypeLabels = {
  contract: "合同电子版",
  invoice: "发票附件",
  acceptance: "验收单",
  settlement: "结算单"
} as const;

export const bizAttachmentStatusLabels = {
  active: "有效",
  archived: "归档"
} as const;

export const invoiceTypeLabels = {
  special: "专票",
  normal: "普票",
  other: "其他"
} as const;

export const invoiceTypeOptions = [
  { value: "special", label: "增值税专用发票" },
  { value: "normal", label: "增值税普通发票" },
  { value: "other", label: "其他" }
] as const;

export const invoiceStatusLabels = {
  issued: "已开票",
  voided: "已作废",
  red_flush: "红冲"
} as const;

export const invoiceStatusOptions = [
  { value: "issued", label: "已开票" },
  { value: "voided", label: "已作废" },
  { value: "red_flush", label: "红冲" }
] as const;

export const paymentSourceTypeLabels = {
  manual: "手工录入",
  finance_sync: "财务同步"
} as const;

export const contractDirectionLabels = {
  SALES: "销售合同",
  PURCHASE: "采购合同"
} as const;

export const invoiceDirectionLabels = {
  OUTPUT: "销项发票",
  INPUT: "进项发票"
} as const;

export const paymentDirectionLabels = {
  INFLOW: "回款",
  OUTFLOW: "付款"
} as const;

export const approvalStatusLabels = {
  pending: "审批中",
  approved: "已通过",
  rejected: "已驳回"
} as const;

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
