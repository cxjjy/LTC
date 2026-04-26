import type { SelectOption } from "@/types/common";

export type ProjectOverviewRecord = {
  id: string;
  contractId: string | null;
  projectName: string;
  customerName: string;
  deliveryMode: string;
  projectStatus: string;
  projectStatusKey: string;
  owner: string;
  region: string;
  contractStatus: string;
  contractSignedAt: string | null;
  contractAmount: number;
  projectProgressText: string;
  projectProgressPercent: number;
  repaymentDate: string | null;
  receivedAmount: number;
  receivableAmount: number;
  repaymentPercent: number;
  expectedRepaymentDate: string;
  totalCost: number;
  paidCost: number;
  payableCost: number;
  projectProfit: number;
  profitRate: number;
  businessAmount: number;
  businessStage: string;
  expectedSignDate: string | null;
  riskLevel: "high" | "medium" | "low";
};

export type ProjectOverviewSummary = {
  projectCount: number;
  contractTotal: number;
  receivableTotal: number;
  receivedTotal: number;
  profitTotal: number;
  highRiskProjectCount: number;
};

export type ProjectOverviewFilterOptions = {
  customers: SelectOption[];
  projectStatuses: SelectOption[];
  owners: SelectOption[];
  regions: SelectOption[];
  contractStatuses: SelectOption[];
  deliveryModes: SelectOption[];
};

export type ProjectOverviewListResult = {
  list: ProjectOverviewRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: ProjectOverviewSummary;
  filterOptions: ProjectOverviewFilterOptions;
};
