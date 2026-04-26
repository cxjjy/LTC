import { ContractStatus, DeliveryStatus, ProjectStatus, ReceivableStatus } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";
import { sumDecimalValues } from "@/modules/core/decimal";
import { CONTRACT_STATUS_ACTIVE } from "@/modules/contracts/status";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return `${date.getMonth() + 1}月`;
}

function roundPercent(value: number) {
  return Number(value.toFixed(1));
}

function roundValue(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function calculatePercentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return roundPercent(((current - previous) / Math.abs(previous)) * 100);
}

function buildTrendMeta(current: number, previous: number) {
  const change = calculatePercentChange(current, previous);
  return {
    change,
    delta: roundValue(current - previous),
    hasBase: previous !== 0,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat"
  } as const;
}

function safePercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }
  return roundPercent((numerator / denominator) * 100);
}

function contractAmountAtDate(
  contracts: Array<{
    contractAmount: unknown;
    status: ContractStatus;
    effectiveDate: Date | null;
    createdAt: Date;
  }>,
  snapshot: Date
) {
  return contracts.reduce((total, item) => {
    if (item.status !== CONTRACT_STATUS_ACTIVE) {
      return total;
    }

    const effectiveAt = item.effectiveDate ?? item.createdAt;
    if (effectiveAt > snapshot) {
      return total;
    }

    return total + Number(item.contractAmount);
  }, 0);
}

function receivedAmountAtDate(
  receivables: Array<{
    amountReceived: unknown;
    receivedDate: Date | null;
  }>,
  snapshot: Date
) {
  return receivables.reduce((total, item) => {
    if (!item.receivedDate || item.receivedDate > snapshot) {
      return total;
    }
    return total + Number(item.amountReceived);
  }, 0);
}

function costAmountAtDate(
  costs: Array<{
    amount: unknown;
    occurredAt: Date;
  }>,
  snapshot: Date
) {
  return costs.reduce((total, item) => {
    if (item.occurredAt > snapshot) {
      return total;
    }
    return total + Number(item.amount);
  }, 0);
}

function outstandingAmountAtDate(
  receivables: Array<{
    amountDue: unknown;
    amountReceived: unknown;
    dueDate: Date;
    receivedDate: Date | null;
  }>,
  snapshot: Date
) {
  return receivables.reduce((total, item) => {
    if (item.dueDate > snapshot) {
      return total;
    }

    const dueAmount = Number(item.amountDue);
    const receivedAmount = item.receivedDate && item.receivedDate <= snapshot ? Number(item.amountReceived) : 0;
    return total + Math.max(dueAmount - receivedAmount, 0);
  }, 0);
}

function overdueAmountAtDate(
  receivables: Array<{
    amountDue: unknown;
    amountReceived: unknown;
    dueDate: Date;
    receivedDate: Date | null;
  }>,
  snapshot: Date
) {
  return receivables.reduce((total, item) => {
    if (item.dueDate > snapshot) {
      return total;
    }

    const receivedAmount = item.receivedDate && item.receivedDate <= snapshot ? Number(item.amountReceived) : 0;
    return total + Math.max(Number(item.amountDue) - receivedAmount, 0);
  }, 0);
}

type ProjectFinance = {
  projectId: string;
  contractAmount: number;
  receivedAmount: number;
  dueAmount: number;
  costAmount: number;
  grossProfit: number;
  grossMargin: number;
  overdueAmount: number;
  delayed: boolean;
  lowMargin: boolean;
  lossMaking: boolean;
  riskLevel: "高" | "中" | "低";
  riskScore: number;
};

function calculateProjectFinance(params: {
  projectId: string;
  contractAmounts: number[];
  receivedAmounts: number[];
  dueAmounts: number[];
  costAmounts: number[];
  overdueAmount: number;
  delayed: boolean;
}): ProjectFinance {
  const contractAmount = sumDecimalValues(params.contractAmounts);
  const receivedAmount = sumDecimalValues(params.receivedAmounts);
  const dueAmount = sumDecimalValues(params.dueAmounts);
  const costAmount = sumDecimalValues(params.costAmounts);
  const grossProfit = contractAmount - costAmount;
  const grossMargin = contractAmount > 0 ? (grossProfit / contractAmount) * 100 : 0;
  const lowMargin = contractAmount > 0 && grossMargin < 20;
  const lossMaking = grossProfit < 0;

  let riskScore = 0;
  if (params.overdueAmount > 0) riskScore += 2;
  if (params.delayed) riskScore += 2;
  if (lowMargin) riskScore += 2;
  if (lossMaking) riskScore += 4;

  const riskLevel = riskScore >= 4 ? "高" : riskScore >= 2 ? "中" : "低";

  return {
    projectId: params.projectId,
    contractAmount,
    receivedAmount,
    dueAmount,
    costAmount,
    grossProfit,
    grossMargin,
    overdueAmount: params.overdueAmount,
    delayed: params.delayed,
    lowMargin,
    lossMaking,
    riskLevel,
    riskScore
  };
}

export async function getDashboardMetrics(user: SessionUser) {
  assertCanAccessRecord(user, "dashboard", "view");

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const previousMonthStart = startOfMonth(addMonths(now, -1));
  const previousMonthEnd = endOfMonth(addMonths(now, -1));
  const trendStart = startOfMonth(addMonths(now, -5));

  const [leads, opportunities, projects, contracts, receivables, costs, deliveries] = await Promise.all([
    prisma.lead.findMany({
      where: { isDeleted: false },
      select: { id: true, status: true }
    }),
    prisma.opportunity.findMany({
      where: { isDeleted: false },
      select: { id: true, stage: true, leadId: true }
    }),
    prisma.project.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        code: true,
        name: true,
        opportunityId: true,
        status: true,
        plannedEndDate: true,
        customer: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.contract.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        code: true,
        projectId: true,
        contractAmount: true,
        status: true,
        effectiveDate: true,
        createdAt: true
      }
    }),
    prisma.receivable.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        projectId: true,
        title: true,
        amountDue: true,
        amountReceived: true,
        dueDate: true,
        receivedDate: true,
        status: true
      }
    }),
    prisma.cost.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        projectId: true,
        title: true,
        amount: true,
        occurredAt: true
      }
    }),
    prisma.delivery.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        projectId: true,
        status: true
      }
    })
  ]);

  const effectiveContracts = contracts.filter((item) => item.status === CONTRACT_STATUS_ACTIVE);
  const totalContractAmount = sumDecimalValues(effectiveContracts.map((item) => item.contractAmount));
  const totalReceivedAmount = sumDecimalValues(receivables.map((item) => item.amountReceived));
  const totalCostAmount = sumDecimalValues(costs.map((item) => item.amount));
  const totalGrossProfit = totalContractAmount - totalCostAmount;
  const grossMargin = safePercent(totalGrossProfit, totalContractAmount);
  const collectionRate = safePercent(totalReceivedAmount, totalContractAmount);
  const unreceivedAmount = Math.max(totalContractAmount - totalReceivedAmount, 0);

  const profitTrendMap = new Map<string, { month: string; contractAmount: number; costAmount: number; profitAmount: number }>();
  const cashflowTrendMap = new Map<string, { month: string; dueAmount: number; receivedAmount: number }>();

  for (let index = 0; index < 6; index += 1) {
    const date = addMonths(trendStart, index);
    const key = monthKey(date);
    profitTrendMap.set(key, {
      month: monthLabel(date),
      contractAmount: 0,
      costAmount: 0,
      profitAmount: 0
    });
    cashflowTrendMap.set(key, {
      month: monthLabel(date),
      dueAmount: 0,
      receivedAmount: 0
    });
  }

  effectiveContracts.forEach((item) => {
    const date = item.effectiveDate ?? item.createdAt;
    if (date < trendStart) return;
    const current = profitTrendMap.get(monthKey(date));
    if (current) {
      current.contractAmount += Number(item.contractAmount);
    }
  });

  costs.forEach((item) => {
    if (item.occurredAt < trendStart) return;
    const current = profitTrendMap.get(monthKey(item.occurredAt));
    if (current) {
      current.costAmount += Number(item.amount);
    }
  });

  Array.from(profitTrendMap.values()).forEach((item) => {
    item.profitAmount = item.contractAmount - item.costAmount;
  });

  receivables.forEach((item) => {
    if (item.dueDate >= trendStart) {
      const dueCurrent = cashflowTrendMap.get(monthKey(item.dueDate));
      if (dueCurrent) {
        dueCurrent.dueAmount += Number(item.amountDue);
      }
    }
    if (item.receivedDate && item.receivedDate >= trendStart) {
      const receivedCurrent = cashflowTrendMap.get(monthKey(item.receivedDate));
      if (receivedCurrent) {
        receivedCurrent.receivedAmount += Number(item.amountReceived);
      }
    }
  });

  const overdueReceivables = receivables.filter(
    (item) =>
      item.status === ReceivableStatus.OVERDUE ||
      (item.dueDate < now && Number(item.amountDue) > Number(item.amountReceived))
  );
  const overdueAmount = overdueReceivables.reduce(
    (total, item) => total + Math.max(Number(item.amountDue) - Number(item.amountReceived), 0),
    0
  );
  const overdueCount = overdueReceivables.length;

  const delayedProjectIds = new Set(
    projects
      .filter(
        (item) =>
          item.plannedEndDate &&
          item.plannedEndDate < now &&
          item.status !== ProjectStatus.COMPLETED &&
          item.status !== ProjectStatus.CANCELED
      )
      .map((item) => item.id)
  );

  const projectFinanceMap = new Map<string, ProjectFinance>();
  for (const project of projects) {
    const projectReceivables = receivables.filter((item) => item.projectId === project.id);
    const projectOverdueAmount = projectReceivables.reduce(
      (total, item) =>
        total +
        ((item.status === ReceivableStatus.OVERDUE || item.dueDate < now)
          ? Math.max(Number(item.amountDue) - Number(item.amountReceived), 0)
          : 0),
      0
    );

    projectFinanceMap.set(
      project.id,
      calculateProjectFinance({
        projectId: project.id,
        contractAmounts: effectiveContracts.filter((item) => item.projectId === project.id).map((item) => Number(item.contractAmount)),
        receivedAmounts: projectReceivables.map((item) => Number(item.amountReceived)),
        dueAmounts: projectReceivables.map((item) => Number(item.amountDue)),
        costAmounts: costs.filter((item) => item.projectId === project.id).map((item) => Number(item.amount)),
        overdueAmount: projectOverdueAmount,
        delayed: delayedProjectIds.has(project.id)
      })
    );
  }

  const lowMarginProjects = Array.from(projectFinanceMap.values()).filter(
    (item) => item.contractAmount > 0 && item.grossMargin < 20
  );
  const lossProjects = Array.from(projectFinanceMap.values()).filter((item) => item.grossProfit < 0);

  const orderedProfitTrend = Array.from(profitTrendMap.values()).map((item) => ({
    ...item,
    profitMargin: item.contractAmount > 0 ? roundPercent((item.profitAmount / item.contractAmount) * 100) : 0
  }));
  const orderedCashflowTrend = Array.from(cashflowTrendMap.values());

  const currentProfitMonth = orderedProfitTrend.at(-1) ?? {
    month: monthLabel(now),
    contractAmount: 0,
    costAmount: 0,
    profitAmount: 0,
    profitMargin: 0
  };
  const previousProfitMonth = orderedProfitTrend.at(-2) ?? {
    month: monthLabel(addMonths(now, -1)),
    contractAmount: 0,
    costAmount: 0,
    profitAmount: 0,
    profitMargin: 0
  };
  const currentCashflowMonth = orderedCashflowTrend.at(-1) ?? {
    month: monthLabel(now),
    dueAmount: 0,
    receivedAmount: 0
  };
  const previousCashflowMonth = orderedCashflowTrend.at(-2) ?? {
    month: monthLabel(addMonths(now, -1)),
    dueAmount: 0,
    receivedAmount: 0
  };

  const projectProfitDistribution = projects
    .map((project) => {
      const finance = projectFinanceMap.get(project.id)!;
      return {
        id: project.id,
        name: project.name,
        profit: finance.grossProfit,
        contractAmount: finance.contractAmount
      };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  const opportunitiesFromLeadCount = opportunities.filter((item) => item.leadId).length;
  const convertedProjectOpportunityCount = new Set(projects.map((item) => item.opportunityId)).size;
  const effectiveContractProjectCount = new Set(effectiveContracts.map((item) => item.projectId)).size;

  const funnelStages = [
    {
      label: "线索",
      count: leads.length,
      conversionRate: 100
    },
    {
      label: "商机",
      count: opportunities.length,
      conversionRate: safePercent(opportunitiesFromLeadCount, leads.length)
    },
    {
      label: "项目",
      count: projects.length,
      conversionRate: safePercent(convertedProjectOpportunityCount, opportunities.length)
    },
    {
      label: "合同",
      count: effectiveContracts.length,
      conversionRate: safePercent(effectiveContractProjectCount, projects.length)
    }
  ];

  const projectLookup = new Map(
    projects.map((project) => [
      project.id,
      {
        code: project.code,
        name: project.name,
        customerName: project.customer.name
      }
    ])
  );

  const keyProjects = projects
    .map((project) => {
      const finance = projectFinanceMap.get(project.id)!;
      const riskReasons = [
        finance.overdueAmount > 0 ? "回款逾期" : null,
        finance.delayed ? "交付延期" : null,
        finance.lowMargin ? "毛利低" : null,
        finance.lossMaking ? "项目亏损" : null
      ].filter(Boolean) as string[];

      return {
        id: project.id,
        code: project.code,
        name: project.name,
        customerName: project.customer.name,
        contractAmount: finance.contractAmount,
        receivedAmount: finance.receivedAmount,
        costAmount: finance.costAmount,
        grossProfit: finance.grossProfit,
        riskLevel: finance.riskLevel,
        riskScore: finance.riskScore,
        riskReasons
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore || b.contractAmount - a.contractAmount)
    .slice(0, 8);

  const monthDueAmount = receivables
    .filter((item) => item.dueDate >= monthStart && item.dueDate <= monthEnd)
    .reduce((sum, item) => sum + Number(item.amountDue), 0);
  const monthReceivedAmount = receivables
    .filter((item) => item.receivedDate && item.receivedDate >= monthStart && item.receivedDate <= monthEnd)
    .reduce((sum, item) => sum + Number(item.amountReceived), 0);

  const previousMonthDueAmount = receivables
    .filter((item) => item.dueDate >= previousMonthStart && item.dueDate <= previousMonthEnd)
    .reduce((sum, item) => sum + Number(item.amountDue), 0);
  const previousMonthReceivedAmount = receivables
    .filter((item) => item.receivedDate && item.receivedDate >= previousMonthStart && item.receivedDate <= previousMonthEnd)
    .reduce((sum, item) => sum + Number(item.amountReceived), 0);

  const currentOutstandingAmount = outstandingAmountAtDate(receivables, monthEnd);
  const previousOutstandingAmount = outstandingAmountAtDate(receivables, previousMonthEnd);
  const currentOverdueAmount = overdueAmountAtDate(receivables, monthEnd);
  const previousOverdueAmount = overdueAmountAtDate(receivables, previousMonthEnd);

  const currentContractSnapshot = contractAmountAtDate(contracts, monthEnd);
  const previousContractSnapshot = contractAmountAtDate(contracts, previousMonthEnd);
  const currentReceivedSnapshot = receivedAmountAtDate(receivables, monthEnd);
  const previousReceivedSnapshot = receivedAmountAtDate(receivables, previousMonthEnd);
  const currentCostSnapshot = costAmountAtDate(costs, monthEnd);
  const previousCostSnapshot = costAmountAtDate(costs, previousMonthEnd);
  const currentUnreceivedSnapshot = Math.max(currentContractSnapshot - currentReceivedSnapshot, 0);
  const previousUnreceivedSnapshot = Math.max(previousContractSnapshot - previousReceivedSnapshot, 0);
  const currentGrossProfitSnapshot = currentContractSnapshot - currentCostSnapshot;
  const previousGrossProfitSnapshot = previousContractSnapshot - previousCostSnapshot;
  const currentMargin = safePercent(currentGrossProfitSnapshot, currentContractSnapshot);
  const previousMargin = safePercent(previousGrossProfitSnapshot, previousContractSnapshot);
  const currentCollectionRate = safePercent(currentReceivedSnapshot, currentContractSnapshot);
  const previousCollectionRate = safePercent(previousReceivedSnapshot, previousContractSnapshot);
  const currentMonthCollectionRate = monthDueAmount > 0 ? safePercent(monthReceivedAmount, monthDueAmount) : 100;
  const overdueRatio = totalContractAmount > 0 ? overdueAmount / totalContractAmount : 0;

  const cashHealthGrade =
    currentMonthCollectionRate >= 85 && collectionRate >= 70 && overdueRatio <= 0.08
      ? "A"
      : currentMonthCollectionRate >= 60 && collectionRate >= 50 && overdueRatio <= 0.18
        ? "B"
        : "C";

  const maxLossProject = projects
    .map((project) => {
      const finance = projectFinanceMap.get(project.id)!;
      return {
        id: project.id,
        name: project.name,
        code: project.code,
        grossProfit: finance.grossProfit,
        riskReasons: [
          finance.lossMaking ? "项目亏损" : null,
          finance.lowMargin ? "毛利低" : null,
          finance.delayed ? "交付延期" : null
        ].filter(Boolean) as string[]
      };
    })
    .filter((item) => item.grossProfit < 0)
    .sort((a, b) => a.grossProfit - b.grossProfit)[0] ?? null;

  const maxOverdueReceivable = overdueReceivables
    .map((item) => {
      const project = projectLookup.get(item.projectId);
      return {
        id: item.id,
        title: item.title,
        projectId: item.projectId,
        projectName: project?.name ?? "未关联项目",
        projectCode: project?.code ?? "",
        overdueAmount: Math.max(Number(item.amountDue) - Number(item.amountReceived), 0)
      };
    })
    .sort((a, b) => b.overdueAmount - a.overdueAmount)[0] ?? null;

  const highRiskProjectCount = Array.from(projectFinanceMap.values()).filter((item) => item.riskLevel === "高").length;

  const contractTrend = buildTrendMeta(currentContractSnapshot, previousContractSnapshot);
  const receivedTrend = buildTrendMeta(currentReceivedSnapshot, previousReceivedSnapshot);
  const unreceivedTrend = buildTrendMeta(currentUnreceivedSnapshot, previousUnreceivedSnapshot);
  const costTrend = buildTrendMeta(currentCostSnapshot, previousCostSnapshot);
  const grossProfitTrend = buildTrendMeta(currentGrossProfitSnapshot, previousGrossProfitSnapshot);
  const marginTrend = buildTrendMeta(currentMargin, previousMargin);
  const collectionTrend = buildTrendMeta(currentCollectionRate, previousCollectionRate);

  return {
    metrics: {
      effectiveContractCount: effectiveContracts.length,
      totalContractAmount,
      totalReceivedAmount,
      unreceivedAmount,
      totalCostAmount,
      totalGrossProfit,
      grossMargin: roundPercent(grossMargin),
      collectionRate: roundPercent(collectionRate),
      trends: {
        totalContractAmount: contractTrend,
        totalReceivedAmount: receivedTrend,
        unreceivedAmount: unreceivedTrend,
        totalCostAmount: costTrend,
        totalGrossProfit: grossProfitTrend,
        grossMargin: marginTrend,
        collectionRate: collectionTrend
      }
    },
    profitTrend: orderedProfitTrend,
    projectProfitDistribution,
    cashflowTrend: orderedCashflowTrend,
    cashflowSummary: {
      monthDueAmount,
      monthReceivedAmount,
      currentMonthCollectionRate,
      overdueAmount,
      overdueCount,
      previousMonthDueAmount,
      previousMonthReceivedAmount,
      currentOutstandingAmount,
      previousOutstandingAmount,
      currentOverdueAmount,
      previousOverdueAmount,
      cashHealthGrade,
      cashHealthHint:
        cashHealthGrade === "A"
          ? "本月应收回笼顺畅，逾期压力较低。"
          : cashHealthGrade === "B"
            ? "现金流可控，但需持续跟进逾期与未回款。"
            : "现金流承压，建议优先催收大额未回款与逾期款。"
    },
    risks: {
      overdueReceivableCount: overdueCount,
      delayedProjectCount: delayedProjectIds.size,
      lowMarginProjectCount: lowMarginProjects.length,
      lossProjectCount: lossProjects.length,
      highRiskProjectCount,
      maxLossProject,
      maxOverdueReceivable
    },
    funnelStages,
    keyProjects,
    profitInsights: {
      currentMonthLabel: currentProfitMonth.month,
      previousMonthLabel: previousProfitMonth.month,
      currentMonthMargin: currentMargin,
      previousMonthMargin: previousMargin,
      marginTrend
    },
    todoItems: [
      { label: "待催收逾期回款", value: overdueCount },
      { label: "待关注延期项目", value: delayedProjectIds.size },
      { label: "待复核低毛利项目", value: lowMarginProjects.length },
      { label: "待止损亏损项目", value: lossProjects.length }
    ]
  };
}
