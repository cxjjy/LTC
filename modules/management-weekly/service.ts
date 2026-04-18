import type { SessionUser } from "@/lib/auth";
import { PAGE_SIZE, projectStatusLabels } from "@/lib/constants";
import { badRequest, forbidden } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord, hasPermission } from "@/lib/rbac";
import { formatWeekKey, getNaturalWeekRange, parseWeekStart, toDatabaseDate } from "@/lib/week";
import { logWeeklyReportAudit } from "@/lib/weekly-report-audit";
import { projectWeeklyService } from "@/modules/project-weekly/service";
import { weeklyTaskService } from "@/modules/weekly-tasks/service";
import { weeklyReportService } from "@/modules/weekly-reports/service";

const weeklyReportItemModel = prisma.weeklyReportItem as any;
const weeklyReportModel = prisma.weeklyReport as any;
const projectWeeklySnapshotModel = prisma.projectWeeklySnapshot as any;

function getMetricDelta(current: number, previous?: number) {
  if (typeof previous !== "number") {
    return 0;
  }

  return Number((current - previous).toFixed(2));
}

function getSubmissionPriorityScore(row: {
  status: string;
  highRiskCount: number;
  needCoordinationCount: number;
  lastSavedAt?: string | Date | null;
}) {
  const statusScore = row.status === "overdue" ? 6 : row.status === "returned" ? 2 : row.status === "draft" ? 1 : 0;
  const savedScore = row.lastSavedAt ? new Date(row.lastSavedAt).getTime() / 1_000_000_000_000 : 0;
  return statusScore * 100 + row.highRiskCount * 20 + row.needCoordinationCount * 10 + savedScore;
}

function buildHandledNote(user: SessionUser) {
  return `[handled] ${new Date().toISOString()} by ${user.name || user.username || user.id}`;
}

function parseHandledState(ownerNote?: string | null) {
  if (!ownerNote?.includes("[handled]")) {
    return {
      handled: false,
      handledLabel: "待处理"
    };
  }

  const line = ownerNote
    .split("\n")
    .find((item) => item.includes("[handled]"))
    ?.replace("[handled]", "")
    .trim();

  return {
    handled: true,
    handledLabel: line ? `已处理 · ${line}` : "已处理"
  };
}

export async function calculateSubmissionStats(weekStart: Date) {
  const dbWeekStart = toDatabaseDate(weekStart);
  const [activeUsers, submittedReports, allReports] = await Promise.all([
    prisma.user.count({
      where: {
        isActive: true,
        isDeleted: false
      }
    }),
    prisma.weeklyReport.count({
      where: {
        weekStart: dbWeekStart,
        status: { in: ["submitted", "reviewed"] }
      }
    }),
    prisma.weeklyReport.count({
      where: { weekStart: dbWeekStart }
    })
  ]);

  return {
    totalUsers: activeUsers,
    submittedUsers: submittedReports,
    draftUsers: Math.max(allReports - submittedReports, 0),
    submissionRate: activeUsers ? Number(((submittedReports / activeUsers) * 100).toFixed(2)) : 0
  };
}

export async function getContinuousRiskProjects(weekStart: Date) {
  const currentRange = getNaturalWeekRange(weekStart);
  const previousRange = getNaturalWeekRange(new Date(currentRange.weekStart.getTime() - 24 * 60 * 60 * 1000));
  const [current, previous] = await Promise.all([
    prisma.projectWeeklySnapshot.findMany({
      where: { weekStart: toDatabaseDate(currentRange.weekStart), riskFlag: true },
      select: { projectId: true }
    }),
    prisma.projectWeeklySnapshot.findMany({
      where: { weekStart: toDatabaseDate(previousRange.weekStart), riskFlag: true },
      select: { projectId: true }
    })
  ]);
  const previousSet = new Set(previous.map((item) => item.projectId));
  const projectIds = current.filter((item) => previousSet.has(item.projectId)).map((item) => item.projectId);

  if (!projectIds.length) {
    return [];
  }

  return prisma.project.findMany({
    where: { id: { in: projectIds }, isDeleted: false },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      createdBy: true
    }
  });
}

class ManagementWeeklyService {
  async getSubmissionStats(weekStart: Date) {
    return calculateSubmissionStats(weekStart);
  }

  async getRiskProjects(weekStart: Date, user: SessionUser) {
    const result = await projectWeeklyService.listProjectWeeklySnapshots(
      {
        week: formatWeekKey(weekStart),
        riskOnly: true,
        page: 1,
        pageSize: PAGE_SIZE
      },
      user
    );
    return result.items;
  }

  async getTrendSeries(weekStart: Date) {
    const ranges = Array.from({ length: 6 }, (_, index) =>
      getNaturalWeekRange(new Date(weekStart.getTime() - (5 - index) * 7 * 24 * 60 * 60 * 1000))
    );

    const submission = [];
    const riskProjects = [];
    const unsubmitted = [];

    for (const range of ranges) {
      const dbWeekStart = toDatabaseDate(range.weekStart);
      const [submissionStats, riskProjectCount] = await Promise.all([
        calculateSubmissionStats(range.weekStart),
        prisma.projectWeeklySnapshot.count({
          where: { weekStart: dbWeekStart, riskFlag: true }
        })
      ]);

      submission.push({
        weekStart: formatWeekKey(range.weekStart),
        value: submissionStats.submissionRate
      });
      riskProjects.push({
        weekStart: formatWeekKey(range.weekStart),
        value: riskProjectCount
      });
      unsubmitted.push({
        weekStart: formatWeekKey(range.weekStart),
        value: Math.max(submissionStats.totalUsers - submissionStats.submittedUsers, 0)
      });
    }

    return { submission, riskProjects, unsubmitted };
  }

  async markRiskProjectHandled(week: string, projectId: string, user: SessionUser) {
    if (!hasPermission(user, "weekly_report:change_status")) {
      throw forbidden("当前账号无权更新风险处理状态");
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

    if (!snapshot) {
      throw badRequest("当前项目周报快照不存在");
    }

    const nextOwnerNote = snapshot.ownerNote
      ? `${snapshot.ownerNote}\n${buildHandledNote(user)}`
      : buildHandledNote(user);

    const updated = await projectWeeklySnapshotModel.update({
      where: { id: snapshot.id },
      data: {
        ownerNote: nextOwnerNote,
        updatedAt: new Date()
      }
    });

    await logWeeklyReportAudit({
      action: "mark_handled",
      entityType: "project_weekly_snapshot",
      entityId: updated.id.toString(),
      operatorUserId: user.id
    });

    return {
      projectId,
      handled: true,
      handledLabel: parseHandledState(updated.ownerNote).handledLabel
    };
  }

  async getManagementWeeklySummary(week: string, user: SessionUser) {
    assertCanAccessRecord(user, "managementWeekly", "view");
    const range = parseWeekStart(week);
    const dbWeekStart = toDatabaseDate(range.weekStart);
    const [submissionStats, riskProjects, continuousRiskProjects, reportIds, trends, submissionRows, pendingTasks] =
      await Promise.all([
        this.getSubmissionStats(range.weekStart),
        this.getRiskProjects(range.weekStart, user),
        getContinuousRiskProjects(range.weekStart),
        weeklyReportModel.findMany({
          where: { weekStart: dbWeekStart },
          select: { id: true }
        }),
        this.getTrendSeries(range.weekStart),
        weeklyReportService.listReportsForWeek(week, user),
        weeklyTaskService.listPendingTasks()
      ]);

    const coordinationNeededCount = reportIds.length
      ? await weeklyReportItemModel.count({
          where: {
            reportId: { in: reportIds.map((item: { id: bigint }) => item.id) },
            needCoordination: true
          }
        })
      : 0;
    const riskItemCount = reportIds.length
      ? await weeklyReportItemModel.count({
          where: {
            itemType: "risk",
            reportId: { in: reportIds.map((item: { id: bigint }) => item.id) }
          }
        })
      : 0;
    const activeProjectRows = reportIds.length
      ? await weeklyReportItemModel.findMany({
          where: {
            reportId: { in: reportIds.map((item: { id: bigint }) => item.id) },
            relatedProjectId: { not: null }
          },
          select: { relatedProjectId: true }
        })
      : [];
    const activeProjectCount = new Set(
      activeProjectRows.map((item: { relatedProjectId: string | null }) => item.relatedProjectId).filter(Boolean)
    ).size;
    const unsubmittedUsers = Math.max(submissionStats.totalUsers - submissionStats.submittedUsers, 0);
    const draftUsers = submissionRows.filter((item: any) => ["draft", "returned"].includes(item.status)).length;

    const trendMeta = {
      submissionRateDelta: getMetricDelta(
        submissionStats.submissionRate,
        trends.submission.at(-2)?.value
      ),
      riskProjectDelta: getMetricDelta(riskProjects.length, trends.riskProjects.at(-2)?.value),
      unsubmittedUsersDelta: getMetricDelta(unsubmittedUsers, trends.unsubmitted.at(-2)?.value),
      continuousRiskProjectDelta: getMetricDelta(
        continuousRiskProjects.length,
        trends.riskProjects.at(-2)?.value ? Math.min(trends.riskProjects.at(-2)?.value ?? 0, continuousRiskProjects.length) : 0
      ),
      activeProjectCountDelta: 0,
      draftUsersDelta: 0,
      submittedUsersDelta: getMetricDelta(submissionStats.submittedUsers, trends.submission.at(-2) ? Math.round(((trends.submission.at(-2)?.value ?? 0) / 100) * submissionStats.totalUsers) : 0),
      coordinationNeededDelta: 0
    };

    const continuousRiskMap = new Map(
      continuousRiskProjects.map((item: { id: string }) => [item.id, 2])
    );

    const mergedRiskProjects = riskProjects
      .map((item: any) => {
        const handledState = parseHandledState(item.ownerNote);
        const riskLevel =
          item.trafficLightStatus === "red" ? "高" : item.trafficLightStatus === "yellow" ? "中" : "低";
        return {
          ...item,
          riskLevel,
          continuousWeeks: continuousRiskMap.get(item.projectId) ?? 1,
          handled: handledState.handled,
          handledLabel: handledState.handledLabel
        };
      })
      .sort((left: any, right: any) => {
        if (left.handled !== right.handled) {
          return Number(left.handled) - Number(right.handled);
        }
        if ((left.continuousWeeks ?? 1) !== (right.continuousWeeks ?? 1)) {
          return (right.continuousWeeks ?? 1) - (left.continuousWeeks ?? 1);
        }
        if ((left.riskCount ?? 0) !== (right.riskCount ?? 0)) {
          return (right.riskCount ?? 0) - (left.riskCount ?? 0);
        }
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });

    const rankedSubmissionRows = [...submissionRows].sort(
      (left: any, right: any) => getSubmissionPriorityScore(right) - getSubmissionPriorityScore(left)
    );

    return {
      weekStart: formatWeekKey(range.weekStart),
      weekEnd: formatWeekKey(range.weekEnd),
      metrics: {
        submissionRate: submissionStats.submissionRate,
        submittedUsers: submissionStats.submittedUsers,
        totalUsers: submissionStats.totalUsers,
        unsubmittedUsers,
        draftUsers,
        riskItemCount,
        riskProjectCount: riskProjects.length,
        continuousRiskProjectCount: continuousRiskProjects.length,
        activeProjectCount,
        coordinationNeededCount
      },
      metricDeltas: trendMeta,
      riskProjects: mergedRiskProjects,
      submissionStats,
      trends,
      pendingTasks,
      continuousRiskProjects: continuousRiskProjects.map((item: { id: string; code: string; name: string; status: keyof typeof projectStatusLabels; createdBy: string }) => ({
        projectId: item.id,
        projectCode: item.code,
        projectName: item.name,
        projectStatus: item.status,
        projectStatusLabel: projectStatusLabels[item.status],
        ownerId: item.createdBy,
        detailHref: `/project-weekly/${week}/${item.id}`
      })),
      submissionRows: rankedSubmissionRows
    };
  }
}

export const managementWeeklyService = new ManagementWeeklyService();
