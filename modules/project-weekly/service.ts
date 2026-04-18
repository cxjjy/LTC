import { Prisma, ProjectStatus } from "@prisma/client";
import { subWeeks } from "date-fns";

import type { SessionUser } from "@/lib/auth";
import { PAGE_SIZE, projectStatusLabels } from "@/lib/constants";
import { badRequest } from "@/lib/errors";
import { createPaginationMeta } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord, canAccessRecord, hasPermission } from "@/lib/rbac";
import { formatWeekKey, getNaturalWeekRange, parseWeekStart, toDatabaseDate } from "@/lib/week";
import { decimalToNumber, toDecimal } from "@/modules/core/decimal";
import { weeklyTaskService } from "@/modules/weekly-tasks/service";
import { serializeWeeklySnapshotRecord } from "@/modules/weekly-reports/service";

const projectWeeklySnapshotModel = prisma.projectWeeklySnapshot as any;
const weeklyReportItemModel = prisma.weeklyReportItem as any;
const weeklyReportModel = prisma.weeklyReport as any;

function extractManualRisk(ownerNote?: string | null) {
  if (!ownerNote?.includes("[manual-risk]")) {
    return false;
  }

  return true;
}

export function resolveProjectRiskFlag(input: {
  riskItemCount: number;
  projectStatus?: ProjectStatus;
}) {
  return input.riskItemCount > 0 || input.projectStatus === ProjectStatus.PAUSED;
}

export function resolveTrafficLightStatus(input: {
  riskCount: number;
  projectStatus?: ProjectStatus;
  receivableDelta: number;
}) {
  if (input.riskCount >= 2 || input.projectStatus === ProjectStatus.PAUSED) {
    return "red" as const;
  }
  if (input.riskCount === 1 || input.receivableDelta <= 0) {
    return "yellow" as const;
  }
  return "green" as const;
}

class ProjectWeeklyService {
  async listProjectWeeklyOverview(
    filters: {
      week: string;
      ownerId?: string;
      keyword?: string;
      riskOnly?: boolean;
    },
    user: SessionUser
  ) {
    assertCanAccessRecord(user, "projectWeekly", "view");
    const range = parseWeekStart(filters.week);
    const dbWeekStart = toDatabaseDate(range.weekStart);
    const previousDbWeekStart = toDatabaseDate(subWeeks(range.weekStart, 1));
    const [linkedItems, previousLinkedItems, snapshots] = (await Promise.all([
      weeklyReportItemModel.findMany({
        where: {
          relatedProjectId: { not: null },
          reportId: {
            in: (
              await weeklyReportModel.findMany({
                where: { weekStart: dbWeekStart },
                select: { id: true }
              })
            ).map((item: { id: bigint }) => item.id)
          }
        },
        select: {
          relatedProjectId: true,
          itemType: true,
          content: true,
          needCoordination: true,
          priority: true
        },
        orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }]
      }),
      weeklyReportItemModel.findMany({
        where: {
          relatedProjectId: { not: null },
          reportId: {
            in: (
              await weeklyReportModel.findMany({
                where: { weekStart: previousDbWeekStart },
                select: { id: true }
              })
            ).map((item: { id: bigint }) => item.id)
          },
          itemType: "risk"
        },
        select: {
          relatedProjectId: true
        }
      }),
      projectWeeklySnapshotModel.findMany({
        where: { weekStart: dbWeekStart },
        select: {
          projectId: true,
          ownerNote: true
        }
      })
    ])) as [
      Array<{
        relatedProjectId: string | null;
        itemType: string;
        content: string;
        needCoordination: boolean;
        priority: string;
      }>,
      Array<{ relatedProjectId: string | null }>,
      Array<{ projectId: string; ownerNote: string | null }>
    ];

    const projectIds = Array.from(
      new Set(linkedItems.map((item) => item.relatedProjectId).filter((value): value is string => Boolean(value)))
    );

    if (!projectIds.length) {
      return {
        weekStart: filters.week,
        items: [],
        stats: {
          totalProjects: 0,
          riskProjects: 0,
          coordinationProjects: 0
        }
      };
    }

    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
        isDeleted: false,
        ...(filters.ownerId ? { createdBy: filters.ownerId } : {}),
        ...(filters.keyword
          ? {
              OR: [{ code: { contains: filters.keyword } }, { name: { contains: filters.keyword } }]
            }
          : {})
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        createdBy: true
      }
    });
    const ownerIds = Array.from(new Set(projects.map((item) => item.createdBy)));
    const users = ownerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, name: true }
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id, item.name]));
    const snapshotMap = new Map(snapshots.map((item) => [item.projectId, item]));
    const previousRiskProjectSet = new Set(
      previousLinkedItems.map((item) => item.relatedProjectId).filter((value): value is string => Boolean(value))
    );
    const groupedItems = new Map<
      string,
      Array<{
        itemType: string;
        content: string;
        needCoordination: boolean;
        priority: string;
      }>
    >();

    linkedItems.forEach((item) => {
      if (!item.relatedProjectId) {
        return;
      }
      const current = groupedItems.get(item.relatedProjectId) ?? [];
      current.push({
        itemType: item.itemType,
        content: item.content,
        needCoordination: item.needCoordination,
        priority: item.priority
      });
      groupedItems.set(item.relatedProjectId, current);
    });

    const items = projects
      .map((project) => {
        const projectItems = groupedItems.get(project.id) ?? [];
        const doneItems = projectItems.filter((item) => item.itemType === "done");
        const planItems = projectItems.filter((item) => item.itemType === "plan");
        const riskItems = projectItems.filter((item) => item.itemType === "risk");
        const riskParticipants = riskItems.length;
        const coordinationCount = projectItems.filter((item) => item.needCoordination).length;
        const manualRisk = extractManualRisk(snapshotMap.get(project.id)?.ownerNote);
        const continuousRisk = previousRiskProjectSet.has(project.id) && riskItems.length > 0;
        const trafficLightStatus =
          manualRisk || continuousRisk || riskParticipants >= 2 ? "red" : riskItems.length > 0 ? "yellow" : "green";

        return {
          projectId: project.id,
          projectName: project.name,
          projectCode: project.code,
          projectCodeHref: `/project-weekly/${filters.week}/${project.id}`,
          projectManageHref: `/projects/${project.id}`,
          ownerName: userMap.get(project.createdBy) ?? project.createdBy,
          trafficLightStatus,
          trafficLightStatusLabel:
            trafficLightStatus === "red" ? "红灯" : trafficLightStatus === "yellow" ? "黄灯" : "绿灯",
          doneItems: doneItems.map((item) => item.content),
          riskItems: riskItems.map((item) => item.content),
          planItems: planItems.map((item) => item.content),
          riskCount: riskItems.length,
          coordinationCount,
          manualRisk,
          continuousRisk
        };
      })
      .filter((item) => (filters.riskOnly ? item.trafficLightStatus !== "green" : true))
      .sort((left, right) => {
        const leftPriority =
          left.trafficLightStatus === "red" ? 3 : left.trafficLightStatus === "yellow" ? 2 : left.coordinationCount > 0 ? 1 : 0;
        const rightPriority =
          right.trafficLightStatus === "red" ? 3 : right.trafficLightStatus === "yellow" ? 2 : right.coordinationCount > 0 ? 1 : 0;
        if (leftPriority !== rightPriority) {
          return rightPriority - leftPriority;
        }
        if (left.coordinationCount !== right.coordinationCount) {
          return right.coordinationCount - left.coordinationCount;
        }
        if (left.riskCount !== right.riskCount) {
          return right.riskCount - left.riskCount;
        }
        return left.projectName.localeCompare(right.projectName, "zh-CN");
      });

    const projectTasks = await weeklyTaskService.listTasksForProjects(items.map((item) => item.projectId));
    const taskMap = new Map<string, Array<(typeof projectTasks)[number]>>();
    projectTasks.forEach((task) => {
      if (!task.projectId) {
        return;
      }
      const current = taskMap.get(task.projectId) ?? [];
      current.push(task);
      taskMap.set(task.projectId, current);
    });

    const enrichedItems = items.map((item) => ({
      ...item,
      tasks: taskMap.get(item.projectId) ?? []
    }));

    return {
      weekStart: filters.week,
      items: enrichedItems,
      stats: {
        totalProjects: enrichedItems.length,
        riskProjects: enrichedItems.filter((item) => item.trafficLightStatus !== "green").length,
        coordinationProjects: enrichedItems.filter((item) => item.coordinationCount > 0).length
      }
    };
  }

  async markProjectWeeklyRisk(week: string, projectId: string, user: SessionUser) {
    const canMarkRisk =
      hasPermission(user, "weekly_report:change_status") ||
      canAccessRecord(user, "project", "update") ||
      canAccessRecord(user, "project", "status");

    if (!canMarkRisk) {
      throw badRequest("当前账号无权标记项目风险");
    }

    const range = parseWeekStart(week);
    const dbWeekStart = toDatabaseDate(range.weekStart);
    const snapshot = await projectWeeklySnapshotModel.findUnique({
      where: {
        projectId_weekStart: {
          projectId,
          weekStart: dbWeekStart
        }
      }
    });
    const nextOwnerNote = snapshot?.ownerNote
      ? snapshot.ownerNote.includes("[manual-risk]")
        ? snapshot.ownerNote
        : `${snapshot.ownerNote}\n[manual-risk] ${new Date().toISOString()}`
      : `[manual-risk] ${new Date().toISOString()}`;

    await projectWeeklySnapshotModel.upsert({
      where: {
        projectId_weekStart: {
          projectId,
          weekStart: dbWeekStart
        }
      },
      update: {
        riskFlag: true,
        trafficLightStatus: "red",
        ownerNote: nextOwnerNote,
        updatedAt: new Date()
      },
      create: {
        projectId,
        weekStart: dbWeekStart,
        weekEnd: toDatabaseDate(range.weekEnd),
        riskFlag: true,
        riskCount: 1,
        trafficLightStatus: "red",
        ownerNote: nextOwnerNote
      }
    });

    return {
      projectId,
      marked: true
    };
  }

  async generateProjectWeeklySnapshots(weekStartInput: Date | string, weekEndInput?: Date) {
    const range =
      typeof weekStartInput === "string"
        ? parseWeekStart(weekStartInput)
        : {
            weekStart: getNaturalWeekRange(weekStartInput).weekStart,
            weekEnd: weekEndInput ?? getNaturalWeekRange(weekStartInput).weekEnd
          };
    const dbWeekStart = toDatabaseDate(range.weekStart);
    const dbWeekEnd = toDatabaseDate(range.weekEnd);

    const reports = (await weeklyReportModel.findMany({
      where: { weekStart: dbWeekStart },
      select: { id: true }
    })) as Array<{ id: bigint }>;
    const reportIds = reports.map((item) => item.id);

    const [projects, costGroups, receivableGroups, reportGroups] = (await Promise.all([
      prisma.project.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          createdBy: true,
          updatedAt: true
        }
      }),
      prisma.cost.groupBy({
        by: ["projectId"],
        where: {
          isDeleted: false,
          occurredAt: {
            gte: range.weekStart,
            lte: range.weekEnd
          }
        },
        _sum: { amount: true }
      }),
      prisma.receivable.groupBy({
        by: ["projectId"],
        where: {
          isDeleted: false,
          receivedDate: {
            gte: range.weekStart,
            lte: range.weekEnd
          }
        },
        _sum: { amountReceived: true }
      }),
      weeklyReportItemModel.findMany({
        where: {
          relatedProjectId: { not: null },
          ...(reportIds.length ? { reportId: { in: reportIds } } : { reportId: BigInt(-1) })
        },
        select: {
          itemType: true,
          content: true,
          priority: true,
          needCoordination: true,
          relatedProjectId: true
        }
      })
    ])) as [
      Array<{ id: string; code: string; name: string; status: ProjectStatus; createdBy: string; updatedAt: Date }>,
      Array<{ projectId: string; _sum: { amount: Prisma.Decimal | null } }>,
      Array<{ projectId: string; _sum: { amountReceived: Prisma.Decimal | null } }>,
      Array<{ itemType: string; content: string; priority: string; needCoordination: boolean; relatedProjectId: string }>
    ];

    const costMap = new Map(costGroups.map((item) => [item.projectId, decimalToNumber(item._sum.amount)]));
    const receivableMap = new Map(
      receivableGroups.map((item) => [item.projectId, decimalToNumber(item._sum.amountReceived)])
    );
    const reportMap = new Map<string, Array<{ itemType: string; content: string; priority: string; needCoordination: boolean }>>();

    reportGroups.forEach((item: { itemType: string; content: string; priority: string; needCoordination: boolean; relatedProjectId: string }) => {
      if (!item.relatedProjectId) {
        return;
      }

      const current = reportMap.get(item.relatedProjectId) ?? [];
      current.push(item);
      reportMap.set(item.relatedProjectId, current);
    });

    for (const project of projects) {
      const linkedItems = reportMap.get(project.id) ?? [];
      const riskCount = linkedItems.filter((item) => item.itemType === "risk").length;
      const weeklyActions = linkedItems
        .filter((item) => item.itemType !== "risk")
        .slice(0, 5)
        .map((item) => item.content)
        .join("；");
      const progressSummaryParts: string[] = [];

      if (linkedItems.length) {
        const doneCount = linkedItems.filter((item) => item.itemType === "done").length;
        const planCount = linkedItems.filter((item) => item.itemType === "plan").length;
        progressSummaryParts.push(`关联个人周报 ${linkedItems.length} 条`);
        if (doneCount) {
          progressSummaryParts.push(`完成 ${doneCount} 条`);
        }
        if (planCount) {
          progressSummaryParts.push(`计划 ${planCount} 条`);
        }
        if (riskCount) {
          progressSummaryParts.push(`风险 ${riskCount} 条`);
        }
      }

      if (project.updatedAt >= range.weekStart && project.updatedAt <= range.weekEnd) {
        progressSummaryParts.push(`项目状态为${projectStatusLabels[project.status]}`);
      }

      const riskFlag = resolveProjectRiskFlag({
        riskItemCount: riskCount,
        projectStatus: project.status
      });
      const receivableDelta = receivableMap.get(project.id) ?? 0;
      const trafficLightStatus = resolveTrafficLightStatus({
        riskCount,
        projectStatus: project.status,
        receivableDelta
      });

      await projectWeeklySnapshotModel.upsert({
        where: {
          projectId_weekStart: {
            projectId: project.id,
            weekStart: dbWeekStart
          }
        },
        update: {
          weekEnd: dbWeekEnd,
          progressSummary: progressSummaryParts.join("；") || null,
          costDelta: toDecimal(costMap.get(project.id) ?? 0) ?? new Prisma.Decimal(0),
          receivableDelta: toDecimal(receivableDelta) ?? new Prisma.Decimal(0),
          riskFlag,
          riskCount,
          trafficLightStatus,
          weeklyActions: weeklyActions || null,
          generatedAt: new Date()
        },
        create: {
          projectId: project.id,
          weekStart: dbWeekStart,
          weekEnd: dbWeekEnd,
          progressSummary: progressSummaryParts.join("；") || null,
          costDelta: toDecimal(costMap.get(project.id) ?? 0) ?? new Prisma.Decimal(0),
          receivableDelta: toDecimal(receivableDelta) ?? new Prisma.Decimal(0),
          riskFlag,
          riskCount,
          trafficLightStatus,
          weeklyActions: weeklyActions || null
        }
      });
    }

    const snapshots = await projectWeeklySnapshotModel.findMany({
      where: { weekStart: dbWeekStart }
    }) as Array<{ id: bigint }>;

    return {
      weekStart: formatWeekKey(range.weekStart),
      generatedCount: snapshots.length
    };
  }

  async listProjectWeeklySnapshots(
    filters: {
      week: string;
      ownerId?: string;
      status?: string;
      riskOnly?: boolean;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
    user: SessionUser
  ) {
    assertCanAccessRecord(user, "projectWeekly", "view");
    const range = parseWeekStart(filters.week);
    const dbWeekStart = toDatabaseDate(range.weekStart);
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : PAGE_SIZE;

    const snapshots = (await projectWeeklySnapshotModel.findMany({
      where: {
        weekStart: dbWeekStart,
        ...(filters.riskOnly ? { riskFlag: true } : {})
      },
      orderBy: [{ riskFlag: "desc" }, { updatedAt: "desc" }]
    })) as Array<any>;
    const projectIds = snapshots.map((item) => item.projectId);

    const projects = projectIds.length
      ? await prisma.project.findMany({
          where: {
            id: { in: projectIds },
            isDeleted: false,
            ...(filters.ownerId ? { createdBy: filters.ownerId } : {}),
            ...(filters.status ? { status: filters.status as ProjectStatus } : {}),
            ...(filters.keyword
              ? {
                  OR: [{ code: { contains: filters.keyword } }, { name: { contains: filters.keyword } }]
                }
              : {})
          },
          select: {
            id: true,
            code: true,
            name: true,
            createdBy: true,
            status: true
          }
        })
      : [];
    const projectMap = new Map(projects.map((item) => [item.id, item]));
    const ownerIds = Array.from(new Set(projects.map((item) => item.createdBy)));
    const users = ownerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, name: true }
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id, item.name]));

    const filteredItems = snapshots
      .map((snapshot) => {
        const project = projectMap.get(snapshot.projectId);
        if (!project) {
          return null;
        }

        return {
          ...serializeWeeklySnapshotRecord(snapshot),
          projectCode: project.code,
          projectCodeHref: `/project-weekly/${filters.week}/${project.id}`,
          projectName: project.name,
          projectStatus: project.status,
          projectStatusLabel: projectStatusLabels[project.status],
          ownerId: project.createdBy,
          ownerName: userMap.get(project.createdBy) ?? project.createdBy,
          trafficLightStatusLabel:
            snapshot.trafficLightStatus === "red"
              ? "红灯"
              : snapshot.trafficLightStatus === "yellow"
                ? "黄灯"
                : "绿灯",
          rowActions: {
            moduleLabel: "项目周报",
            recordLabel: `${project.code} / ${project.name}`,
            viewHref: `/project-weekly/${filters.week}/${project.id}`
          }
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => {
        if (left.riskFlag !== right.riskFlag) {
          return Number(right.riskFlag) - Number(left.riskFlag);
        }
        if ((left.riskCount ?? 0) !== (right.riskCount ?? 0)) {
          return (right.riskCount ?? 0) - (left.riskCount ?? 0);
        }
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });

    const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: pagedItems,
      ...createPaginationMeta(filteredItems.length, page, pageSize)
    };
  }

  async getProjectWeeklySnapshot(projectId: string, week: string, user: SessionUser) {
    assertCanAccessRecord(user, "projectWeekly", "view");
    const range = parseWeekStart(week);
    const dbWeekStart = toDatabaseDate(range.weekStart);
    const previousDbWeekStart = toDatabaseDate(subWeeks(range.weekStart, 1));
    const [snapshot, project, previousSnapshot, linkedItems, previousRiskItems] = await Promise.all([
      projectWeeklySnapshotModel.findUnique({
        where: {
          projectId_weekStart: {
            projectId,
            weekStart: dbWeekStart
          }
        }
      }),
      prisma.project.findFirst({
        where: { id: projectId, isDeleted: false },
        select: { id: true, code: true, name: true, status: true, createdBy: true }
      }),
      projectWeeklySnapshotModel.findUnique({
        where: {
          projectId_weekStart: {
            projectId,
            weekStart: toDatabaseDate(subWeeks(range.weekStart, 1))
          }
        }
      }),
      weeklyReportItemModel.findMany({
        where: {
          relatedProjectId: projectId,
          reportId: {
            in: (
              await weeklyReportModel.findMany({
                where: { weekStart: dbWeekStart },
                select: { id: true }
              })
            ).map((item: { id: bigint }) => item.id)
          }
        },
        select: {
          id: true,
          content: true,
          itemType: true,
          priority: true,
          needCoordination: true,
          impactNote: true
        },
        orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }]
      }),
      weeklyReportItemModel.findMany({
        where: {
          relatedProjectId: projectId,
          itemType: "risk",
          reportId: {
            in: (
              await weeklyReportModel.findMany({
                where: { weekStart: previousDbWeekStart },
                select: { id: true }
              })
            ).map((item: { id: bigint }) => item.id)
          }
        },
        select: { id: true }
      })
    ]);

    if (!project) {
      throw badRequest("项目不存在");
    }

    const normalizedLinkedItems = linkedItems as Array<{
      id: bigint;
      content: string;
      itemType: string;
      priority: string;
      needCoordination: boolean;
      impactNote: string | null;
    }>;
    const liveRiskCount = normalizedLinkedItems.filter((item) => item.itemType === "risk").length;
    const trafficLightStatus =
      snapshot?.trafficLightStatus ??
      (previousRiskItems.length > 0 && liveRiskCount > 0
        ? "red"
        : liveRiskCount > 1
          ? "red"
          : liveRiskCount > 0
            ? "yellow"
            : "green");
    const continuousRisk = Boolean(previousSnapshot?.riskFlag || previousRiskItems.length > 0) && liveRiskCount > 0;
    const progressSummary =
      snapshot?.progressSummary ??
      (normalizedLinkedItems.length
        ? `本周聚合 ${normalizedLinkedItems.length} 条关联周报，完成 ${normalizedLinkedItems.filter((item) => item.itemType === "done").length} 条，计划 ${normalizedLinkedItems.filter((item) => item.itemType === "plan").length} 条，风险 ${liveRiskCount} 条`
        : null);
    const weeklyActions =
      snapshot?.weeklyActions ??
      normalizedLinkedItems
        .filter((item) => item.itemType !== "risk")
        .slice(0, 5)
        .map((item) => item.content)
        .join("；");

    return {
      ...serializeWeeklySnapshotRecord(
        snapshot ?? {
          id: BigInt(0),
          projectId,
          weekStart: range.weekStart,
          weekEnd: range.weekEnd,
          progressSummary,
          costDelta: 0,
          receivableDelta: 0,
          riskFlag: liveRiskCount > 0,
          riskCount: liveRiskCount,
          trafficLightStatus,
          weeklyActions: weeklyActions || null,
          ownerNote: null,
          generatedAt: new Date(),
          updatedAt: new Date()
        }
      ),
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
        status: project.status,
        statusLabel: projectStatusLabels[project.status]
      },
      linkedItems: normalizedLinkedItems.map((item) => ({
        id: item.id.toString(),
        content: item.content,
        itemType: item.itemType,
        priority: item.priority,
        needCoordination: item.needCoordination,
        impactNote: item.impactNote
      })),
      continuousRisk
    };
  }
}

export const projectWeeklyService = new ProjectWeeklyService();
