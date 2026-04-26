import { ContractStatus, OpportunityStage, Prisma, ProjectStatus } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { opportunityStageLabels, projectStatusLabels } from "@/lib/constants";
import { createPaginationMeta, type ListParams } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";
import { decimalToNumber } from "@/modules/core/decimal";
import { CONTRACT_STATUS_ACTIVE } from "@/modules/contracts/status";
import type {
  ProjectOverviewFilterOptions,
  ProjectOverviewListResult,
  ProjectOverviewRecord,
  ProjectOverviewSummary
} from "@/modules/projects/overview/types";
import type { SelectOption } from "@/types/common";

type ProjectOverviewSource = Prisma.ProjectGetPayload<{
  include: {
    customer: true;
    opportunity: true;
    contracts: {
      where: { isDeleted: false };
    };
    receivables: {
      where: { isDeleted: false };
    };
    costs: {
      where: { isDeleted: false };
    };
    deliveries: {
      where: { isDeleted: false };
    };
  };
}>;

type SnapshotItem = {
  projectId: string;
  progressSummary: string | null;
  riskFlag: boolean;
};

function uniqueOptions(values: string[]): SelectOption[] {
  return Array.from(new Set(values.filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "zh-CN"))
    .map((value) => ({ label: value, value }));
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function normalizeOverviewText(value?: string | null) {
  const text = value?.trim();
  return text && text.length > 0 ? text : "未设置";
}

function resolveProgressPercent(project: ProjectOverviewSource) {
  if (project.deliveries.length) {
    const acceptedCount = project.deliveries.filter((item) => item.status === "ACCEPTED").length;
    const inProgressCount = project.deliveries.filter((item) => item.status === "IN_PROGRESS").length;
    return clampPercent(((acceptedCount + inProgressCount * 0.65) / project.deliveries.length) * 100);
  }

  switch (project.status) {
    case ProjectStatus.COMPLETED:
      return 100;
    case ProjectStatus.IN_PROGRESS:
      return 62;
    case ProjectStatus.PAUSED:
      return 38;
    case ProjectStatus.INITIATING:
      return 8;
    default:
      return 0;
  }
}

function resolveProgressText(project: ProjectOverviewSource, snapshot?: SnapshotItem) {
  if (snapshot?.progressSummary) {
    return snapshot.progressSummary;
  }

  if (project.status === ProjectStatus.COMPLETED) {
    return "项目已完成，等待最终结项与经营归档。";
  }

  if (project.receivables.some((item) => item.status === "RECEIVED")) {
    return "项目持续交付中，已有阶段性回款到账。";
  }

  if (project.deliveries.some((item) => item.status === "ACCEPTED")) {
    return "交付阶段已验收，正在推进后续里程碑与回款。";
  }

  if (project.deliveries.some((item) => item.status === "IN_PROGRESS")) {
    return "项目处于交付推进中，当前以里程碑执行为主。";
  }

  return "项目已立项，正在推进合同、资源与交付准备。";
}

function resolveProjectStatus(status: ProjectStatus) {
  switch (status) {
    case ProjectStatus.INITIATING:
      return "未开始";
    case ProjectStatus.PAUSED:
      return "暂停";
    case ProjectStatus.COMPLETED:
      return "已完成";
    case ProjectStatus.IN_PROGRESS:
      return "进行中";
    default:
      return projectStatusLabels[status];
  }
}

function resolveContractStatus(project: ProjectOverviewSource) {
  const latestContract = [...project.contracts].sort((left, right) => {
    const leftValue = left.signedDate?.getTime() ?? left.createdAt.getTime();
    const rightValue = right.signedDate?.getTime() ?? right.createdAt.getTime();
    return rightValue - leftValue;
  })[0];

  if (latestContract?.status === CONTRACT_STATUS_ACTIVE) {
    return "合同已签回";
  }

  if (
    project.opportunity.stage === OpportunityStage.NEGOTIATION ||
    project.opportunity.stage === OpportunityStage.QUOTATION ||
    project.opportunity.stage === OpportunityStage.PROPOSAL ||
    project.opportunity.stage === OpportunityStage.WON
  ) {
    return "商机阶段50%";
  }

  return "商机阶段30%";
}

function resolveExpectedRepaymentLabel(receivables: ProjectOverviewSource["receivables"]) {
  const pending = receivables
    .filter((item) => item.amountDue.gt(item.amountReceived))
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());

  if (!pending.length) {
    return "已全部回款";
  }

  const diffDays = Math.ceil((pending[0].dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 60) {
    return "60天内";
  }
  if (diffDays <= 90) {
    return "90天内";
  }
  if (diffDays <= 180) {
    return "180天内";
  }
  return "180天以上";
}

function resolveRiskLevel(record: Pick<ProjectOverviewRecord, "expectedRepaymentDate" | "projectProfit" | "projectStatus">, snapshot?: SnapshotItem) {
  if (snapshot?.riskFlag || record.expectedRepaymentDate === "180天以上" || record.projectProfit < 0 || record.projectStatus === "暂停") {
    return "high";
  }
  if (record.expectedRepaymentDate === "180天内" || record.projectProfit <= 10000) {
    return "medium";
  }
  return "low";
}

function compareValues(left: string | number | null, right: string | number | null, order: "asc" | "desc") {
  const leftValue = left ?? "";
  const rightValue = right ?? "";
  let result = 0;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    result = leftValue - rightValue;
  } else {
    result = String(leftValue).localeCompare(String(rightValue), "zh-CN");
  }

  return order === "asc" ? result : -result;
}

function buildSummary(records: ProjectOverviewRecord[]): ProjectOverviewSummary {
  return {
    projectCount: records.length,
    contractTotal: records.reduce((sum, item) => sum + item.contractAmount, 0),
    receivableTotal: records.reduce((sum, item) => sum + item.receivableAmount, 0),
    receivedTotal: records.reduce((sum, item) => sum + item.receivedAmount, 0),
    profitTotal: records.reduce((sum, item) => sum + item.projectProfit, 0),
    highRiskProjectCount: records.filter((item) => item.riskLevel === "high").length
  };
}

function buildFilterOptions(records: ProjectOverviewRecord[]): ProjectOverviewFilterOptions {
  return {
    customers: uniqueOptions(records.map((item) => item.customerName)),
    projectStatuses: uniqueOptions(records.map((item) => item.projectStatus)),
    owners: uniqueOptions(records.map((item) => item.owner)),
    regions: uniqueOptions(records.map((item) => item.region)),
    contractStatuses: uniqueOptions(records.map((item) => item.contractStatus)),
    deliveryModes: uniqueOptions(records.map((item) => item.deliveryMode))
  };
}

class ProjectOverviewService {
  async list(params: Required<ListParams>, user: SessionUser): Promise<ProjectOverviewListResult> {
    assertCanAccessRecord(user, "project", "view");

    const filters = params.filters ?? {};
    const where: Prisma.ProjectWhereInput = {
      isDeleted: false,
      ...(params.keyword
        ? {
            OR: [
              { name: { contains: params.keyword } },
              { code: { contains: params.keyword } },
              { customer: { name: { contains: params.keyword } } }
            ]
          }
        : {}),
      ...(filters.customerName ? { customer: { name: { contains: filters.customerName } } } : {}),
      ...(filters.projectStatus
        ? {
            status:
              ({
                未开始: ProjectStatus.INITIATING,
                进行中: ProjectStatus.IN_PROGRESS,
                暂停: ProjectStatus.PAUSED,
                已完成: ProjectStatus.COMPLETED
              } as Record<string, ProjectStatus | undefined>)[filters.projectStatus]
          }
        : {})
    };

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: true,
        opportunity: true,
        contracts: {
          where: { isDeleted: false }
        },
        receivables: {
          where: { isDeleted: false }
        },
        costs: {
          where: { isDeleted: false }
        },
        deliveries: {
          where: { isDeleted: false }
        }
      }
    });

    const snapshots = projects.length
      ? await prisma.projectWeeklySnapshot.findMany({
          where: {
            projectId: { in: projects.map((item) => item.id) }
          },
          orderBy: [{ weekStart: "desc" }, { generatedAt: "desc" }],
          distinct: ["projectId"]
        })
      : [];

    const userIds = Array.from(new Set(projects.map((item) => item.createdBy).filter(Boolean)));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, displayName: true, name: true }
        })
      : [];

    const snapshotMap = new Map(
      snapshots.map((item) => [
        item.projectId,
        {
          projectId: item.projectId,
          progressSummary: item.progressSummary,
          riskFlag: item.riskFlag
        } satisfies SnapshotItem
      ])
    );
    const userMap = new Map(users.map((item) => [item.id, item.displayName || item.name]));
    const projectIds = projects.map((item) => item.id);
    const paymentRecords = projectIds.length
      ? await prisma.paymentRecord.findMany({
          where: {
            projectId: { in: projectIds }
          }
        })
      : [];
    const paymentMap = new Map<string, typeof paymentRecords>();

    paymentRecords.forEach((item) => {
      const key = item.projectId;
      if (!key) {
        return;
      }

      paymentMap.set(key, [...(paymentMap.get(key) ?? []), item]);
    });

    const aggregated = projects.map((project) => {
      const snapshot = snapshotMap.get(project.id);
      const latestContract = [...project.contracts].sort((left, right) => {
        const leftValue = left.signedDate?.getTime() ?? left.createdAt.getTime();
        const rightValue = right.signedDate?.getTime() ?? right.createdAt.getTime();
        return rightValue - leftValue;
      })[0];
      const latestReceivedReceivable = [...project.receivables]
        .filter((item) => item.receivedDate)
        .sort((left, right) => (right.receivedDate?.getTime() ?? 0) - (left.receivedDate?.getTime() ?? 0))[0];
      const salesContracts = project.contracts.filter((item: any) => item.direction !== "PURCHASE");
      const purchaseContracts = project.contracts.filter((item: any) => item.direction === "PURCHASE");
      const payments = paymentMap.get(project.id) ?? [];
      const inflowPayments = payments.filter((item: any) => item.direction !== "OUTFLOW");
      const outflowPayments = payments.filter((item: any) => item.direction === "OUTFLOW");
      const legacyReceivedAmount = project.receivables.reduce((sum, item) => sum + decimalToNumber(item.amountReceived), 0);
      const paymentReceivedAmount = inflowPayments.reduce((sum, item) => sum + decimalToNumber(item.paymentAmount), 0);
      const receivedAmount = inflowPayments.length ? paymentReceivedAmount : legacyReceivedAmount;
      const contractAmount =
        salesContracts.reduce((sum, item) => sum + decimalToNumber(item.contractAmount), 0) ||
        decimalToNumber(project.opportunity.amount);
      const receivableAmount = Math.max(contractAmount - receivedAmount, 0);
      const purchaseContractAmount = purchaseContracts.reduce((sum, item) => sum + decimalToNumber(item.contractAmount), 0);
      const paidCost = outflowPayments.reduce((sum, item) => sum + decimalToNumber(item.paymentAmount), 0);
      const totalCost =
        purchaseContractAmount ||
        paidCost ||
        project.costs.reduce((sum, item) => sum + decimalToNumber(item.amount), 0);
      const payableCost = Math.max(purchaseContractAmount - paidCost, 0);
      const projectProfit = contractAmount - purchaseContractAmount;
      const profitRate = contractAmount > 0 ? (projectProfit / contractAmount) * 100 : 0;
      const owner =
        (project as any).ownerName ||
        project.deliveries.find((item) => item.ownerName)?.ownerName ||
        userMap.get(project.createdBy) ||
        "未分配";

      const record: ProjectOverviewRecord = {
        id: project.id,
        contractId: latestContract?.id ?? null,
        projectName: project.name,
        customerName: project.customer.name,
        deliveryMode: normalizeOverviewText(project.deliveryMode),
        projectStatus: resolveProjectStatus(project.status),
        projectStatusKey: project.status,
        owner,
        region: normalizeOverviewText(project.region),
        contractStatus: resolveContractStatus(project),
        contractSignedAt: latestContract?.signedDate?.toISOString() ?? null,
        contractAmount,
        projectProgressText: resolveProgressText(project, snapshot),
        projectProgressPercent: resolveProgressPercent(project),
        repaymentDate: latestReceivedReceivable?.receivedDate?.toISOString() ?? null,
        receivedAmount,
        receivableAmount,
        repaymentPercent: receivableAmount > 0 ? clampPercent((receivedAmount / receivableAmount) * 100) : 0,
        expectedRepaymentDate: resolveExpectedRepaymentLabel(project.receivables),
        totalCost,
        paidCost,
        payableCost,
        projectProfit,
        profitRate,
        businessAmount: decimalToNumber(project.opportunity.amount),
        businessStage: opportunityStageLabels[project.opportunity.stage],
        expectedSignDate: project.opportunity.expectedSignDate?.toISOString() ?? null,
        riskLevel: "low"
      };

      record.riskLevel = resolveRiskLevel(record, snapshot);
      return record;
    });

    const filterOptions = buildFilterOptions(aggregated);
    const filtered = aggregated.filter((item) => {
      if (filters.owner && item.owner !== filters.owner) {
        return false;
      }
      if (filters.region && item.region !== filters.region) {
        return false;
      }
      if (filters.contractStatus && item.contractStatus !== filters.contractStatus) {
        return false;
      }
      if (filters.deliveryMode && item.deliveryMode !== filters.deliveryMode) {
        return false;
      }
      if (filters.riskLevel && item.riskLevel !== filters.riskLevel) {
        return false;
      }
      return true;
    });

    const summary = buildSummary(filtered);
    const sortBy = params.sortBy || "contractAmount";
    const sorted = [...filtered].sort((left, right) => {
      switch (sortBy) {
        case "contractSignedAt":
          return compareValues(left.contractSignedAt, right.contractSignedAt, params.sortOrder);
        case "receivableAmount":
          return compareValues(left.receivableAmount, right.receivableAmount, params.sortOrder);
        case "projectProfit":
          return compareValues(left.projectProfit, right.projectProfit, params.sortOrder);
        case "profitRate":
          return compareValues(left.profitRate, right.profitRate, params.sortOrder);
        default:
          return compareValues(left.contractAmount, right.contractAmount, params.sortOrder);
      }
    });

    const page = params.page;
    const pageSize = params.pageSize;
    const startIndex = (page - 1) * pageSize;
    const list = sorted.slice(startIndex, startIndex + pageSize);

    return {
      list,
      filterOptions,
      summary,
      ...createPaginationMeta(sorted.length, page, pageSize)
    };
  }
}

export const projectOverviewService = new ProjectOverviewService();
