import { Prisma } from "@prisma/client";
import type {
  ContractStatus,
  CostCategory,
  DeliveryStatus,
  EntityType,
  LeadStatus,
  OpportunityStage,
  ProjectStatus,
  ReceivableStatus
} from "@prisma/client";

import { prisma } from "../lib/prisma";

const INDUSTRIES = ["高端制造", "新能源", "连锁零售", "医药", "物流供应链", "软件服务", "建筑工程", "教育科技"];
const LEAD_SOURCES = ["老客转介绍", "渠道合作", "行业展会", "官网咨询", "市场活动", "主动拜访"];
const SALES_NAMES = ["陈顾问", "刘经理", "孙顾问", "赵经理", "周顾问", "吴经理"];
const PM_NAMES = ["王工", "李工", "张工", "许工", "何工"];

type CustomerScenario = {
  customerName: string;
  industry: string;
  leadTitle: string;
  opportunityName?: string;
  opportunityStage?: OpportunityStage;
  leadStatus: LeadStatus;
  revenue?: number;
  winRate?: number;
  projectName?: string;
  projectStatus?: ProjectStatus;
  budgetAmount?: number;
  contractName?: string;
  contractStatus?: string;
  contractAmount?: number;
  signedAt?: string;
  effectiveAt?: string | null;
  plannedStartAt?: string;
  plannedEndAt?: string;
  deliveries?: Array<{
    title: string;
    ownerName: string;
    status: DeliveryStatus;
    plannedDate: string;
    actualDate?: string | null;
    acceptanceDate?: string | null;
  }>;
  costs?: Array<{
    title: string;
    category: CostCategory;
    amount: number;
    occurredAt: string;
  }>;
  receivables?: Array<{
    title: string;
    amountDue: number;
    amountReceived: number;
    dueDate: string;
    receivedDate?: string | null;
    status: ReceivableStatus;
  }>;
};

const SCENARIOS: CustomerScenario[] = [
  {
    customerName: "华东精工集团",
    industry: "高端制造",
    leadTitle: "MES 二期与设备联网升级",
    opportunityName: "华东精工二期数字工厂商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 1680000,
    winRate: 88,
    projectName: "华东精工数字工厂二期",
    projectStatus: "IN_PROGRESS",
    budgetAmount: 1320000,
    contractName: "华东精工二期实施合同",
    contractStatus: "ACTIVE",
    contractAmount: 1680000,
    signedAt: "2025-10-12",
    effectiveAt: "2025-10-15",
    plannedStartAt: "2025-10-20",
    plannedEndAt: "2026-06-30",
    deliveries: [
      { title: "蓝图与接口确认", ownerName: "王工", status: "ACCEPTED", plannedDate: "2025-11-10", actualDate: "2025-11-11", acceptanceDate: "2025-11-12" },
      { title: "现场实施与联调", ownerName: "李工", status: "IN_PROGRESS", plannedDate: "2026-03-15", actualDate: "2026-03-16" }
    ],
    costs: [
      { title: "一期实施人工", category: "LABOR", amount: 285000, occurredAt: "2025-11-20" },
      { title: "边缘采集硬件", category: "PROCUREMENT", amount: 240000, occurredAt: "2025-12-10" },
      { title: "顾问差旅", category: "TRAVEL", amount: 28000, occurredAt: "2026-01-18" },
      { title: "接口外包开发", category: "OUTSOURCING", amount: 168000, occurredAt: "2026-02-12" }
    ],
    receivables: [
      { title: "首付款", amountDue: 504000, amountReceived: 504000, dueDate: "2025-10-30", receivedDate: "2025-10-28", status: "RECEIVED" },
      { title: "阶段验收款", amountDue: 672000, amountReceived: 420000, dueDate: "2026-02-28", receivedDate: "2026-03-10", status: "PARTIAL" },
      { title: "尾款", amountDue: 504000, amountReceived: 0, dueDate: "2026-07-10", status: "PENDING" }
    ]
  },
  {
    customerName: "云岚新能源",
    industry: "新能源",
    leadTitle: "储能工厂生产协同平台",
    opportunityName: "云岚新能源制造协同商机",
    opportunityStage: "NEGOTIATION",
    leadStatus: "CONVERTED",
    revenue: 980000,
    winRate: 65
  },
  {
    customerName: "益康医药",
    industry: "医药",
    leadTitle: "GSP 仓储与质量追溯",
    opportunityName: "益康医药仓储追溯商机",
    opportunityStage: "QUOTATION",
    leadStatus: "CONVERTED",
    revenue: 720000,
    winRate: 55
  },
  {
    customerName: "星联物流",
    industry: "物流供应链",
    leadTitle: "干线运输调度平台升级",
    opportunityName: "星联物流调度平台商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 1360000,
    winRate: 82,
    projectName: "星联物流调度中台项目",
    projectStatus: "PAUSED",
    budgetAmount: 1080000,
    contractName: "星联物流调度平台合同",
    contractStatus: "ACTIVE",
    contractAmount: 1360000,
    signedAt: "2025-08-22",
    effectiveAt: "2025-08-25",
    plannedStartAt: "2025-09-01",
    plannedEndAt: "2026-02-28",
    deliveries: [
      { title: "需求访谈", ownerName: "张工", status: "ACCEPTED", plannedDate: "2025-09-15", actualDate: "2025-09-15", acceptanceDate: "2025-09-16" },
      { title: "调度算法联调", ownerName: "许工", status: "DELAYED", plannedDate: "2026-01-25", actualDate: "2026-02-08" }
    ],
    costs: [
      { title: "实施团队人工", category: "LABOR", amount: 360000, occurredAt: "2025-10-18" },
      { title: "算法服务外包", category: "OUTSOURCING", amount: 310000, occurredAt: "2025-12-06" },
      { title: "调度大屏设备", category: "PROCUREMENT", amount: 180000, occurredAt: "2025-11-28" }
    ],
    receivables: [
      { title: "预付款", amountDue: 408000, amountReceived: 408000, dueDate: "2025-08-30", receivedDate: "2025-08-30", status: "RECEIVED" },
      { title: "中期款", amountDue: 544000, amountReceived: 0, dueDate: "2026-01-15", status: "OVERDUE" },
      { title: "尾款", amountDue: 408000, amountReceived: 0, dueDate: "2026-04-15", status: "PENDING" }
    ]
  },
  {
    customerName: "启辰教育科技",
    industry: "教育科技",
    leadTitle: "校区经营数据中台",
    opportunityName: "启辰教育经营数据商机",
    opportunityStage: "DISCOVERY",
    leadStatus: "CONVERTED",
    revenue: 320000,
    winRate: 35
  },
  {
    customerName: "瑞城建设",
    industry: "建筑工程",
    leadTitle: "工程项目协同管理需求",
    opportunityName: "瑞城建设工程协同商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 860000,
    winRate: 76,
    projectName: "瑞城建设项目协同平台",
    projectStatus: "COMPLETED",
    budgetAmount: 680000,
    contractName: "瑞城建设项目协同合同",
    contractStatus: "ACTIVE",
    contractAmount: 860000,
    signedAt: "2025-06-08",
    effectiveAt: "2025-06-12",
    plannedStartAt: "2025-06-15",
    plannedEndAt: "2025-12-20",
    deliveries: [
      { title: "管理驾驶舱上线", ownerName: "何工", status: "ACCEPTED", plannedDate: "2025-09-30", actualDate: "2025-10-02", acceptanceDate: "2025-10-05" },
      { title: "移动端验收", ownerName: "王工", status: "ACCEPTED", plannedDate: "2025-12-15", actualDate: "2025-12-18", acceptanceDate: "2025-12-20" }
    ],
    costs: [
      { title: "项目实施人工", category: "LABOR", amount: 210000, occurredAt: "2025-07-20" },
      { title: "现场驻场差旅", category: "TRAVEL", amount: 52000, occurredAt: "2025-09-18" },
      { title: "移动端开发外包", category: "OUTSOURCING", amount: 108000, occurredAt: "2025-10-26" }
    ],
    receivables: [
      { title: "首付款", amountDue: 258000, amountReceived: 258000, dueDate: "2025-06-20", receivedDate: "2025-06-18", status: "RECEIVED" },
      { title: "验收款", amountDue: 344000, amountReceived: 344000, dueDate: "2025-10-10", receivedDate: "2025-10-12", status: "RECEIVED" },
      { title: "尾款", amountDue: 258000, amountReceived: 258000, dueDate: "2025-12-25", receivedDate: "2026-01-06", status: "RECEIVED" }
    ]
  },
  {
    customerName: "沐橙零售",
    industry: "连锁零售",
    leadTitle: "门店巡检与订货协同",
    opportunityName: "沐橙零售门店经营商机",
    opportunityStage: "LOST",
    leadStatus: "CONVERTED",
    revenue: 460000,
    winRate: 25
  },
  {
    customerName: "同岳软件",
    industry: "软件服务",
    leadTitle: "客户成功运营平台",
    opportunityName: "同岳软件客户运营商机",
    opportunityStage: "PROPOSAL",
    leadStatus: "CONVERTED",
    revenue: 540000,
    winRate: 48
  },
  {
    customerName: "博川科技",
    industry: "软件服务",
    leadTitle: "项目经营分析平台",
    opportunityName: "博川科技经营分析商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 1180000,
    winRate: 79,
    projectName: "博川科技经营分析平台",
    projectStatus: "IN_PROGRESS",
    budgetAmount: 940000,
    contractName: "博川科技经营分析实施合同",
    contractStatus: "ACTIVE",
    contractAmount: 1180000,
    signedAt: "2025-11-02",
    effectiveAt: "2025-11-05",
    plannedStartAt: "2025-11-08",
    plannedEndAt: "2026-05-30",
    deliveries: [
      { title: "多维利润模型设计", ownerName: "许工", status: "ACCEPTED", plannedDate: "2025-12-05", actualDate: "2025-12-07", acceptanceDate: "2025-12-08" },
      { title: "资金看板与预警配置", ownerName: "李工", status: "IN_PROGRESS", plannedDate: "2026-03-20", actualDate: "2026-03-18" }
    ],
    costs: [
      { title: "核心实施人工", category: "LABOR", amount: 260000, occurredAt: "2025-12-20" },
      { title: "报表引擎采购", category: "PROCUREMENT", amount: 140000, occurredAt: "2026-01-10" },
      { title: "交付差旅", category: "TRAVEL", amount: 22000, occurredAt: "2026-02-03" }
    ],
    receivables: [
      { title: "启动款", amountDue: 354000, amountReceived: 354000, dueDate: "2025-11-12", receivedDate: "2025-11-10", status: "RECEIVED" },
      { title: "阶段款", amountDue: 472000, amountReceived: 250000, dueDate: "2026-02-20", receivedDate: "2026-03-05", status: "PARTIAL" },
      { title: "尾款", amountDue: 354000, amountReceived: 0, dueDate: "2026-06-10", status: "PENDING" }
    ]
  },
  {
    customerName: "联晟医疗",
    industry: "医药",
    leadTitle: "质量追溯平台",
    opportunityName: "联晟医疗追溯平台商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 760000,
    winRate: 72,
    projectName: "联晟医疗质量追溯项目",
    projectStatus: "CANCELED",
    budgetAmount: 620000,
    contractName: "联晟医疗追溯平台合同",
    contractStatus: "FINISHED",
    contractAmount: 760000,
    signedAt: "2025-07-18",
    effectiveAt: null,
    plannedStartAt: "2025-08-01",
    plannedEndAt: "2026-01-31",
    deliveries: [
      { title: "项目启动会", ownerName: "王工", status: "CANCELED", plannedDate: "2025-08-08" }
    ],
    costs: [
      { title: "前期方案人工", category: "LABOR", amount: 68000, occurredAt: "2025-08-10" }
    ]
  },
  {
    customerName: "远泽供应链",
    industry: "物流供应链",
    leadTitle: "仓网经营分析",
    opportunityName: "远泽供应链经营分析商机",
    opportunityStage: "NEGOTIATION",
    leadStatus: "CONVERTED",
    revenue: 610000,
    winRate: 61
  },
  {
    customerName: "华启电气",
    industry: "高端制造",
    leadTitle: "设备售后工单平台",
    opportunityName: "华启电气售后平台商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 930000,
    winRate: 74,
    projectName: "华启电气售后工单项目",
    projectStatus: "IN_PROGRESS",
    budgetAmount: 700000,
    contractName: "华启电气售后平台合同",
    contractStatus: "ACTIVE",
    contractAmount: 930000,
    signedAt: "2026-01-05",
    effectiveAt: "2026-01-08",
    plannedStartAt: "2026-01-12",
    plannedEndAt: "2026-08-10",
    deliveries: [
      { title: "工单流程梳理", ownerName: "张工", status: "ACCEPTED", plannedDate: "2026-01-28", actualDate: "2026-01-29", acceptanceDate: "2026-01-30" },
      { title: "备件库存联调", ownerName: "何工", status: "IN_PROGRESS", plannedDate: "2026-04-20", actualDate: "2026-04-18" }
    ],
    costs: [
      { title: "项目人工", category: "LABOR", amount: 240000, occurredAt: "2026-02-02" },
      { title: "现场终端采购", category: "PROCUREMENT", amount: 260000, occurredAt: "2026-02-20" },
      { title: "对接外包开发", category: "OUTSOURCING", amount: 210000, occurredAt: "2026-03-18" }
    ],
    receivables: [
      { title: "首付款", amountDue: 279000, amountReceived: 279000, dueDate: "2026-01-15", receivedDate: "2026-01-14", status: "RECEIVED" },
      { title: "中期款", amountDue: 372000, amountReceived: 0, dueDate: "2026-03-20", status: "OVERDUE" },
      { title: "尾款", amountDue: 279000, amountReceived: 0, dueDate: "2026-08-20", status: "PENDING" }
    ]
  },
  {
    customerName: "嘉木家居",
    industry: "连锁零售",
    leadTitle: "门店配货与陈列分析",
    opportunityName: "嘉木家居零售协同商机",
    opportunityStage: "REQUIREMENT",
    leadStatus: "CONVERTED",
    revenue: 390000,
    winRate: 42
  },
  {
    customerName: "盛安检测",
    industry: "医药",
    leadTitle: "实验室设备台账系统",
    opportunityName: "盛安检测设备台账商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 520000,
    winRate: 69,
    projectName: "盛安检测设备台账项目",
    projectStatus: "COMPLETED",
    budgetAmount: 410000,
    contractName: "盛安检测设备台账合同",
    contractStatus: "ACTIVE",
    contractAmount: 520000,
    signedAt: "2025-09-06",
    effectiveAt: "2025-09-10",
    plannedStartAt: "2025-09-12",
    plannedEndAt: "2026-01-20",
    deliveries: [
      { title: "系统实施", ownerName: "王工", status: "ACCEPTED", plannedDate: "2025-11-20", actualDate: "2025-11-22", acceptanceDate: "2025-11-25" }
    ],
    costs: [
      { title: "实施人工", category: "LABOR", amount: 140000, occurredAt: "2025-10-18" },
      { title: "终端采购", category: "PROCUREMENT", amount: 88000, occurredAt: "2025-11-08" }
    ],
    receivables: [
      { title: "首付款", amountDue: 156000, amountReceived: 156000, dueDate: "2025-09-18", receivedDate: "2025-09-18", status: "RECEIVED" },
      { title: "验收款", amountDue: 208000, amountReceived: 208000, dueDate: "2025-12-05", receivedDate: "2025-12-08", status: "RECEIVED" },
      { title: "尾款", amountDue: 156000, amountReceived: 156000, dueDate: "2026-01-25", receivedDate: "2026-02-02", status: "RECEIVED" }
    ]
  },
  {
    customerName: "睿科智造",
    industry: "高端制造",
    leadTitle: "生产节拍优化平台",
    opportunityName: "睿科智造节拍优化商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 1080000,
    winRate: 77,
    projectName: "睿科智造节拍优化项目",
    projectStatus: "IN_PROGRESS",
    budgetAmount: 760000,
    contractName: "睿科智造节拍优化合同",
    contractStatus: "ACTIVE",
    contractAmount: 1080000,
    signedAt: "2025-12-10",
    effectiveAt: "2025-12-12",
    plannedStartAt: "2025-12-15",
    plannedEndAt: "2026-07-15",
    deliveries: [
      { title: "车间调研", ownerName: "许工", status: "ACCEPTED", plannedDate: "2026-01-05", actualDate: "2026-01-06", acceptanceDate: "2026-01-07" },
      { title: "算法模型上线", ownerName: "李工", status: "IN_PROGRESS", plannedDate: "2026-04-30", actualDate: "2026-04-25" }
    ],
    costs: [
      { title: "实施人工", category: "LABOR", amount: 340000, occurredAt: "2026-01-26" },
      { title: "算法外包", category: "OUTSOURCING", amount: 290000, occurredAt: "2026-02-28" },
      { title: "工业终端", category: "PROCUREMENT", amount: 215000, occurredAt: "2026-02-10" }
    ],
    receivables: [
      { title: "预付款", amountDue: 324000, amountReceived: 324000, dueDate: "2025-12-20", receivedDate: "2025-12-19", status: "RECEIVED" },
      { title: "中期款", amountDue: 432000, amountReceived: 180000, dueDate: "2026-03-30", receivedDate: "2026-03-20", status: "PARTIAL" },
      { title: "尾款", amountDue: 324000, amountReceived: 0, dueDate: "2026-07-20", status: "PENDING" }
    ]
  },
  {
    customerName: "中禾农业",
    industry: "新能源",
    leadTitle: "农业物联网监控平台",
    leadStatus: "FOLLOWING"
  },
  {
    customerName: "星跃传媒",
    industry: "软件服务",
    leadTitle: "媒体经营分析需求",
    leadStatus: "NEW"
  },
  {
    customerName: "泰岳汽配",
    industry: "高端制造",
    leadTitle: "售后配件协同平台",
    opportunityName: "泰岳汽配售后协同商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 640000,
    winRate: 68,
    projectName: "泰岳汽配售后协同项目",
    projectStatus: "IN_PROGRESS",
    budgetAmount: 590000,
    contractName: "泰岳汽配售后协同合同",
    contractStatus: "APPROVING",
    contractAmount: 640000,
    signedAt: "2026-03-12",
    effectiveAt: null,
    plannedStartAt: "2026-03-20",
    plannedEndAt: "2026-10-20",
    deliveries: [
      { title: "项目准备", ownerName: "何工", status: "NOT_STARTED", plannedDate: "2026-03-28" }
    ],
    costs: [
      { title: "项目启动人工", category: "LABOR", amount: 36000, occurredAt: "2026-03-18" }
    ]
  },
  {
    customerName: "辰海冷链",
    industry: "物流供应链",
    leadTitle: "冷链仓网数字化",
    opportunityName: "辰海冷链仓网商机",
    opportunityStage: "NEGOTIATION",
    leadStatus: "CONVERTED",
    revenue: 820000,
    winRate: 58
  },
  {
    customerName: "派森科技",
    industry: "软件服务",
    leadTitle: "企业经营驾驶舱",
    opportunityName: "派森科技经营驾驶舱商机",
    opportunityStage: "WON",
    leadStatus: "CONVERTED",
    revenue: 1500000,
    winRate: 84,
    projectName: "派森科技经营驾驶舱项目",
    projectStatus: "IN_PROGRESS",
    budgetAmount: 980000,
    contractName: "派森科技经营驾驶舱合同",
    contractStatus: "ACTIVE",
    contractAmount: 1500000,
    signedAt: "2026-02-01",
    effectiveAt: "2026-02-03",
    plannedStartAt: "2026-02-08",
    plannedEndAt: "2026-08-31",
    deliveries: [
      { title: "指标体系梳理", ownerName: "李工", status: "ACCEPTED", plannedDate: "2026-02-18", actualDate: "2026-02-17", acceptanceDate: "2026-02-19" },
      { title: "经营驾驶舱上线", ownerName: "王工", status: "IN_PROGRESS", plannedDate: "2026-05-30", actualDate: "2026-05-25" }
    ],
    costs: [
      { title: "项目人工", category: "LABOR", amount: 320000, occurredAt: "2026-02-25" },
      { title: "数据治理外包", category: "OUTSOURCING", amount: 210000, occurredAt: "2026-03-08" },
      { title: "可视化采购", category: "PROCUREMENT", amount: 98000, occurredAt: "2026-03-18" }
    ],
    receivables: [
      { title: "首付款", amountDue: 450000, amountReceived: 450000, dueDate: "2026-02-10", receivedDate: "2026-02-10", status: "RECEIVED" },
      { title: "阶段款", amountDue: 600000, amountReceived: 0, dueDate: "2026-03-22", status: "OVERDUE" },
      { title: "尾款", amountDue: 450000, amountReceived: 0, dueDate: "2026-09-10", status: "PENDING" }
    ]
  },
  {
    customerName: "宏信物业",
    industry: "连锁零售",
    leadTitle: "园区服务工单平台",
    opportunityName: "宏信物业工单平台商机",
    opportunityStage: "LOST",
    leadStatus: "CONVERTED",
    revenue: 280000,
    winRate: 18
  },
  {
    customerName: "丰越电商",
    industry: "连锁零售",
    leadTitle: "大促备货与库存分析",
    opportunityName: "丰越电商库存分析商机",
    opportunityStage: "QUOTATION",
    leadStatus: "CONVERTED",
    revenue: 410000,
    winRate: 47
  }
];

async function nextCode(tx: Prisma.TransactionClient, entityType: EntityType) {
  const prefixMap: Record<EntityType, string> = {
    USER: "USER",
    ROLE: "ROLE",
    PERMISSION: "PERM",
    CUSTOMER: "CUST",
    LEAD: "LEAD",
    OPPORTUNITY: "OPP",
    PROJECT: "PROJ",
    CONTRACT: "CONT",
    DELIVERY: "DELI",
    COST: "COST",
    RECEIVABLE: "REC",
    AUDIT_LOG: "AUD"
  };

  const year = new Date().getFullYear();
  const existing = await tx.codeSequence.findUnique({
    where: {
      entityType_year: {
        entityType,
        year
      }
    }
  });

  const currentValue = (existing?.currentValue ?? 0) + 1;

  if (existing) {
    await tx.codeSequence.update({
      where: { id: existing.id },
      data: { currentValue }
    });
  } else {
    await tx.codeSequence.create({
      data: {
        entityType,
        prefix: prefixMap[entityType],
        year,
        currentValue
      }
    });
  }

  return `${prefixMap[entityType]}-${year}${String(currentValue).padStart(4, "0")}`;
}

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function date(input?: string | null) {
  if (!input) return null;
  return new Date(`${input}T09:00:00+08:00`);
}

function estimatedCosts(revenue: number, industryIndex: number) {
  const labor = Math.round(revenue * (0.13 + (industryIndex % 3) * 0.02));
  const outsource = Math.round(revenue * (0.06 + (industryIndex % 2) * 0.025));
  const procurement = Math.round(revenue * (0.08 + (industryIndex % 4) * 0.02));
  const travel = Math.round(revenue * 0.018);
  const other = Math.round(revenue * 0.012);
  const total = labor + outsource + procurement + travel + other;
  const profit = revenue - total;
  const margin = revenue > 0 ? profit / revenue : 0;

  return {
    labor,
    outsource,
    procurement,
    travel,
    other,
    total,
    profit,
    margin
  };
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { username: "admin" }
  });

  if (!admin) {
    throw new Error("未找到 admin 账号，请先执行 seed。");
  }

  for (let index = 0; index < SCENARIOS.length; index += 1) {
    const scenario = SCENARIOS[index];
    const scenarioTag = `demo-real-${String(index + 1).padStart(2, "0")}`;

    await prisma.$transaction(async (tx) => {
      const customerCode = await nextCode(tx, "CUSTOMER");
      const leadCode = await nextCode(tx, "LEAD");

      const customer = await tx.customer.create({
        data: {
          code: customerCode,
          name: scenario.customerName,
          industry: scenario.industry,
          contactName: SALES_NAMES[index % SALES_NAMES.length],
          contactPhone: `139${String(10000000 + index * 137).slice(-8)}`,
          address: `上海市浦东新区经营大道 ${80 + index} 号`,
          remark: `${scenario.industry}演示客户，使用更贴近真实分布的数据生成`,
          createdBy: admin.id,
          updatedBy: admin.id
        }
      });

      const revenue = scenario.revenue ?? 0;
      const estimate = estimatedCosts(revenue, index);

      const lead = await tx.lead.create({
        data: {
          code: leadCode,
          customerId: customer.id,
          title: scenario.leadTitle,
          source: LEAD_SOURCES[index % LEAD_SOURCES.length],
          contactName: customer.contactName,
          contactPhone: customer.contactPhone,
          expectedAmount: revenue ? decimal(revenue) : null,
          expectedCloseDate: date(`2026-${String(((index % 6) + 4)).padStart(2, "0")}-${String(8 + (index % 12)).padStart(2, "0")}`),
          latestFollowUpAt: date(`2026-03-${String(2 + (index % 20)).padStart(2, "0")}`),
          description: `${scenario.customerName} 的${scenario.leadTitle}需求正在跟进。`,
          status: scenario.leadStatus,
          createdBy: admin.id,
          updatedBy: admin.id
        }
      });

      let opportunityId: string | null = null;
      let projectId: string | null = null;
      let contractId: string | null = null;

      if (scenario.opportunityName && scenario.opportunityStage) {
        const opportunityCode = await nextCode(tx, "OPPORTUNITY");
        const opportunity = await tx.opportunity.create({
          data: {
            code: opportunityCode,
            customerId: customer.id,
            leadId: lead.id,
            name: scenario.opportunityName,
            description: `${scenario.customerName} 的售前推进记录`,
            amount: decimal(revenue),
            estimatedRevenue: decimal(revenue),
            estimatedLaborCost: decimal(estimate.labor),
            estimatedOutsourceCost: decimal(estimate.outsource),
            estimatedProcurementCost: decimal(estimate.procurement),
            estimatedTravelCost: decimal(estimate.travel),
            estimatedOtherCost: decimal(estimate.other),
            estimatedTotalCost: decimal(estimate.total),
            estimatedProfit: decimal(estimate.profit),
            estimatedProfitMargin: decimal(estimate.margin),
            expectedSignDate: date(`2026-${String(((index % 6) + 4)).padStart(2, "0")}-${String(12 + (index % 10)).padStart(2, "0")}`),
            winRate: scenario.winRate ?? 40,
            stage: scenario.opportunityStage,
            createdBy: admin.id,
            updatedBy: admin.id
          }
        });
        opportunityId = opportunity.id;

        if (scenario.projectName && scenario.projectStatus) {
          const projectCode = await nextCode(tx, "PROJECT");
          const project = await tx.project.create({
            data: {
              code: projectCode,
              customerId: customer.id,
              opportunityId: opportunity.id,
              name: scenario.projectName,
              description: `${scenario.customerName} 的项目推进与经营数据`,
              budgetAmount: decimal(scenario.budgetAmount ?? revenue * 0.75),
              plannedStartDate: date(scenario.plannedStartAt)!,
              plannedEndDate: date(scenario.plannedEndAt)!,
              status: scenario.projectStatus,
              createdBy: admin.id,
              updatedBy: admin.id
            }
          });
          projectId = project.id;

          if (scenario.contractName && scenario.contractStatus && scenario.contractAmount) {
            const contractCode = await nextCode(tx, "CONTRACT");
            const contract = await tx.contract.create({
              data: {
                code: contractCode,
                customerId: customer.id,
                projectId: project.id,
                name: scenario.contractName,
                contractAmount: decimal(scenario.contractAmount),
                signedDate: date(scenario.signedAt)!,
                effectiveDate: date(scenario.effectiveAt),
                endDate: date(scenario.plannedEndAt),
                status: scenario.contractStatus as ContractStatus | undefined,
                description: `${scenario.customerName} 的合同数据`,
                createdBy: admin.id,
                updatedBy: admin.id
              }
            });
            contractId = contract.id;

            for (const deliveryItem of scenario.deliveries ?? []) {
              const deliveryCode = await nextCode(tx, "DELIVERY");
              await tx.delivery.create({
                data: {
                  code: deliveryCode,
                  customerId: customer.id,
                  projectId: project.id,
                  title: deliveryItem.title,
                  description: `${scenario.customerName} - ${deliveryItem.title}`,
                  ownerName: deliveryItem.ownerName,
                  plannedDate: date(deliveryItem.plannedDate)!,
                  actualDate: date(deliveryItem.actualDate),
                  acceptanceDate: date(deliveryItem.acceptanceDate),
                  status: deliveryItem.status,
                  createdBy: admin.id,
                  updatedBy: admin.id
                }
              });
            }

            for (const costItem of scenario.costs ?? []) {
              const costCode = await nextCode(tx, "COST");
              await tx.cost.create({
                data: {
                  code: costCode,
                  customerId: customer.id,
                  projectId: project.id,
                  title: costItem.title,
                  category: costItem.category,
                  amount: decimal(costItem.amount),
                  occurredAt: date(costItem.occurredAt)!,
                  description: `${scenario.customerName} - ${costItem.title}`,
                  createdBy: admin.id,
                  updatedBy: admin.id
                }
              });
            }

            for (const receivableItem of scenario.receivables ?? []) {
              const receivableCode = await nextCode(tx, "RECEIVABLE");
              await tx.receivable.create({
                data: {
                  code: receivableCode,
                  customerId: customer.id,
                  projectId: project.id,
                  contractId: contract.id,
                  title: receivableItem.title,
                  amountDue: decimal(receivableItem.amountDue),
                  amountReceived: decimal(receivableItem.amountReceived),
                  dueDate: date(receivableItem.dueDate)!,
                  receivedDate: date(receivableItem.receivedDate),
                  status: receivableItem.status,
                  description: `${scenario.customerName} - ${receivableItem.title}`,
                  createdBy: admin.id,
                  updatedBy: admin.id
                }
              });
            }
          }
        }
      }

      await tx.auditLog.createMany({
        data: [
          {
            entityType: "CUSTOMER",
            entityId: customer.id,
            entityCode: customer.code,
            action: "CREATE",
            message: "生成真实分布演示客户",
            actorId: admin.id,
            payload: { batch: scenarioTag }
          },
          {
            entityType: "LEAD",
            entityId: lead.id,
            entityCode: lead.code,
            action: scenario.leadStatus === "CONVERTED" ? "CONVERT" : "CREATE",
            message: scenario.leadStatus === "CONVERTED" ? "演示：线索已进入商机阶段" : "生成真实分布演示线索",
            actorId: admin.id,
            payload: { batch: scenarioTag, opportunityId }
          },
          ...(opportunityId
            ? [
                {
                  entityType: "OPPORTUNITY" as const,
                  entityId: opportunityId,
                  entityCode: "",
                  action: "CREATE" as const,
                  message: "生成真实分布演示商机",
                  actorId: admin.id,
                  payload: { batch: scenarioTag, projectId }
                }
              ]
            : []),
          ...(projectId
            ? [
                {
                  entityType: "PROJECT" as const,
                  entityId: projectId,
                  entityCode: "",
                  action: "CREATE" as const,
                  message: "生成真实分布演示项目",
                  actorId: admin.id,
                  payload: { batch: scenarioTag, contractId }
                }
              ]
            : [])
        ]
      });
    });
  }

  console.log(`Added ${SCENARIOS.length} realistic demo business scenarios.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
