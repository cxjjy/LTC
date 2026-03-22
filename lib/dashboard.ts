import { ContractStatus, DeliveryStatus, ProjectStatus, ReceivableStatus } from "@prisma/client";

import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord } from "@/lib/rbac";
import { decimalToNumber, sumDecimalValues } from "@/modules/core/decimal";

export type DashboardFilters = {
  periodMonths: 6 | 12;
  projectStatus: "ALL" | ProjectStatus;
};

type MonthlyPoint = {
  label: string;
  contractAmount: number;
  receivedAmount: number;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

export async function getDashboardMetrics(user: SessionUser, filters: DashboardFilters = { periodMonths: 6, projectStatus: "ALL" }) {
  assertCanAccessRecord(user, "dashboard", "view");

  const statusFilter =
    filters.projectStatus === "ALL"
      ? {}
      : {
          status: filters.projectStatus
        };

  const now = new Date();
  const trendStart = startOfMonth(addMonths(now, -(filters.periodMonths - 1)));

  const [projects, contracts, receivables, costs, deliveries] = await Promise.all([
    prisma.project.findMany({
      where: {
        isDeleted: false,
        ...statusFilter
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        budgetAmount: true,
        plannedEndDate: true,
        updatedAt: true,
        createdAt: true,
        customer: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    }),
    prisma.contract.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        contractAmount: true,
        effectiveDate: true,
        createdAt: true,
        status: true
      }
    }),
    prisma.receivable.findMany({
      where: {
        isDeleted: false
      },
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
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        amount: true,
        occurredAt: true
      }
    }),
    prisma.delivery.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        plannedDate: true,
        actualDate: true,
        status: true
      }
    })
  ]);

  const visibleProjectIds = new Set(projects.map((item) => item.id));
  const scopedContracts = contracts.filter((item) => visibleProjectIds.has(item.projectId));
  const scopedReceivables = receivables.filter((item) => visibleProjectIds.has(item.projectId));
  const scopedCosts = costs.filter((item) => visibleProjectIds.has(item.projectId));
  const scopedDeliveries = deliveries.filter((item) => visibleProjectIds.has(item.projectId));

  const contractAmountTotal = sumDecimalValues(scopedContracts.map((item) => item.contractAmount));
  const receivedAmountTotal = sumDecimalValues(scopedReceivables.map((item) => item.amountReceived));
  const costAmountTotal = sumDecimalValues(scopedCosts.map((item) => item.amount));
  const amountDueTotal = sumDecimalValues(scopedReceivables.map((item) => item.amountDue));
  const grossProfit = contractAmountTotal - costAmountTotal;

  const statusDistribution = [
    { label: "立项中", value: projects.filter((item) => item.status === ProjectStatus.INITIATING).length, color: "#93c5fd" },
    { label: "进行中", value: projects.filter((item) => item.status === ProjectStatus.IN_PROGRESS).length, color: "#3b82f6" },
    { label: "已暂停", value: projects.filter((item) => item.status === ProjectStatus.PAUSED).length, color: "#f59e0b" },
    { label: "已完成", value: projects.filter((item) => item.status === ProjectStatus.COMPLETED).length, color: "#10b981" },
    { label: "已取消", value: projects.filter((item) => item.status === ProjectStatus.CANCELED).length, color: "#f87171" }
  ].filter((item) => item.value > 0);

  const trendMap = new Map<string, MonthlyPoint>();
  for (let index = 0; index < filters.periodMonths; index += 1) {
    const date = addMonths(trendStart, index);
    trendMap.set(monthKey(date), {
      label: monthLabel(date),
      contractAmount: 0,
      receivedAmount: 0
    });
  }

  scopedContracts.forEach((item) => {
    const date = item.effectiveDate ?? item.createdAt;
    if (date < trendStart) {
      return;
    }

    const current = trendMap.get(monthKey(date));
    if (current) {
      current.contractAmount += decimalToNumber(item.contractAmount);
    }
  });

  scopedReceivables.forEach((item) => {
    const date = item.receivedDate;
    if (!date || date < trendStart) {
      return;
    }

    const current = trendMap.get(monthKey(date));
    if (current) {
      current.receivedAmount += decimalToNumber(item.amountReceived);
    }
  });

  const trend = Array.from(trendMap.values());

  const executionProjects = projects
    .map((project) => {
      const projectDeliveries = scopedDeliveries.filter((item) => item.projectId === project.id);
      const acceptedCount = projectDeliveries.filter((item) => item.status === DeliveryStatus.ACCEPTED).length;
      const inProgressCount = projectDeliveries.filter((item) => item.status === DeliveryStatus.IN_PROGRESS).length;
      const progress =
        projectDeliveries.length > 0
          ? Math.round(((acceptedCount + inProgressCount * 0.5) / projectDeliveries.length) * 100)
          : project.status === ProjectStatus.COMPLETED
            ? 100
            : project.status === ProjectStatus.IN_PROGRESS
              ? 60
              : project.status === ProjectStatus.PAUSED
                ? 45
                : 20;

      return {
        id: project.id,
        code: project.code,
        name: project.name,
        customerName: project.customer.name,
        status: project.status,
        plannedEndDate: project.plannedEndDate,
        progress
      };
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 6);

  const overdueReceivables = scopedReceivables
    .filter((item) => item.status === ReceivableStatus.OVERDUE || (item.dueDate < now && decimalToNumber(item.amountDue) > decimalToNumber(item.amountReceived)))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: item.title,
      amountDue: decimalToNumber(item.amountDue),
      amountReceived: decimalToNumber(item.amountReceived),
      dueDate: item.dueDate
    }));

  const delayedProjects = projects
    .filter((project) => {
      if (!project.plannedEndDate) {
        return false;
      }

      return project.plannedEndDate < now && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELED;
    })
    .slice(0, 5)
    .map((project) => ({
      id: project.id,
      name: project.name,
      plannedEndDate: project.plannedEndDate
    }));

  const overBudgetProjects = projects
    .map((project) => {
      const budgetAmount = decimalToNumber(project.budgetAmount);
      const projectCost = sumDecimalValues(
        scopedCosts.filter((item) => item.projectId === project.id).map((item) => item.amount)
      );

      return {
        id: project.id,
        name: project.name,
        budgetAmount,
        projectCost
      };
    })
    .filter((item) => item.budgetAmount > 0 && item.projectCost > item.budgetAmount)
    .slice(0, 5);

  const recentProjects = [...projects]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      customerName: project.customer.name,
      createdAt: project.createdAt,
      status: project.status
    }));

  const todoItems = [
    { label: "待跟进逾期回款", value: overdueReceivables.length, tone: "warning" as const },
    { label: "待处理延期项目", value: delayedProjects.length, tone: "danger" as const },
    { label: "待控制超预算项目", value: overBudgetProjects.length, tone: "warning" as const },
    {
      label: "待推进草稿合同",
      value: scopedContracts.filter((item) => item.status === ContractStatus.DRAFT).length,
      tone: "default" as const
    }
  ];

  return {
    filters,
    metrics: {
      inProgressProjects: projects.filter((item) => item.status === ProjectStatus.IN_PROGRESS).length,
      contractAmountTotal,
      receivedAmountTotal,
      unreceivedAmountTotal: Math.max(amountDueTotal - receivedAmountTotal, 0),
      costAmountTotal,
      grossProfit
    },
    trend,
    statusDistribution,
    executionProjects,
    risks: {
      overdueReceivables,
      delayedProjects,
      overBudgetProjects
    },
    recentProjects,
    todoItems
  };
}
