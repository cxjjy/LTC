import { EntityType, Prisma } from "@prisma/client";
import { subWeeks } from "date-fns";

import type { SessionUser } from "@/lib/auth";
import { weeklyReportItemTypeLabels, weeklyReportSuggestionSourceLabels } from "@/lib/constants";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertCanAccessRecord, hasPermission } from "@/lib/rbac";
import { formatWeekKey, getNaturalWeekRange, parseWeekStart, toDatabaseDate } from "@/lib/week";
import { logWeeklyReportAudit } from "@/lib/weekly-report-audit";
import { weeklyTaskService } from "@/modules/weekly-tasks/service";
import type {
  ApplyWeeklyReportSuggestionsDto,
  GenerateWeeklyReportSuggestionsDto,
  IgnoreWeeklyReportSuggestionsDto,
  RemindWeeklyReportDto,
  ReturnWeeklyReportDto,
  ReviewWeeklyReportDto,
  SaveWeeklyReportDraftDto
} from "@/modules/weekly-reports/dto";

type WeeklyReportRecord = {
  id: bigint;
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  status: string;
  summary: string | null;
  submittedAt: Date | null;
  lastSavedAt: Date | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  returnNote: string | null;
  returnedAt: Date | null;
  returnedBy: string | null;
  overdueMarkedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type WeeklyReportItemRecord = {
  id: bigint;
  reportId: bigint;
  itemType: string;
  content: string;
  priority: string;
  needCoordination: boolean;
  expectedFinishAt: Date | null;
  impactNote: string | null;
  relatedProjectId: string | null;
  relatedOpportunityId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};
type WeeklyReportSuggestionRecord = {
  id: bigint;
  userId: string;
  weekStart: Date;
  sectionType: string;
  sourceType: string;
  sourceRef: string | null;
  reason: string | null;
  content: string;
  relatedProjectId: string | null;
  relatedOpportunityId: string | null;
  confidenceScore: Prisma.Decimal | number;
  status: string;
  extraPayload: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};
type SuggestionPayload = {
  priority?: string;
  needCoordination?: boolean;
  expectedFinishAt?: string | null;
  impactNote?: string | null;
};

const weeklyReportModel = prisma.weeklyReport as any;
const weeklyReportItemModel = prisma.weeklyReportItem as any;
const weeklyReportReminderModel = prisma.weeklyReportReminder as any;
const weeklyReportSuggestionModel = prisma.weeklyReportSuggestion as any;

function formatCandidateLabel(item: { code: string; name: string }) {
  return `${item.code} / ${item.name}`;
}

function normalizeNullableString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeDateOnlyString(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return formatWeekKey(date);
}

function toReportId(value: string) {
  try {
    return BigInt(value);
  } catch {
    throw badRequest("周报ID不正确");
  }
}

function canManageWeeklyReport(user: SessionUser) {
  return hasPermission(user, "weekly_report:change_status") || hasPermission(user, "management_weekly:view");
}

function assertCanManageWeeklyReport(user: SessionUser) {
  if (!canManageWeeklyReport(user)) {
    throw forbidden("当前账号缺少周报管理权限");
  }
}

function isEditableStatus(status: string) {
  return ["draft", "overdue", "returned"].includes(status);
}

function buildDraftItemWrite(item: SaveWeeklyReportDraftDto["items"][number], index: number) {
  return {
    itemType: item.itemType,
    content: item.content.trim(),
    priority: item.priority,
    needCoordination: Boolean(item.needCoordination),
    expectedFinishAt: item.itemType === "plan" && item.expectedFinishAt ? toDatabaseDate(item.expectedFinishAt) : null,
    impactNote: normalizeNullableString(item.impactNote),
    relatedProjectId: normalizeNullableString(item.relatedProjectId),
    relatedOpportunityId: normalizeNullableString(item.relatedOpportunityId),
    sortOrder: item.sortOrder ?? index
  };
}

function toDbWeekStart(weekStartDate: Date) {
  return toDatabaseDate(getNaturalWeekRange(weekStartDate).weekStart);
}

function serializeItem(item: WeeklyReportItemRecord) {
  return {
    id: item.id.toString(),
    reportId: item.reportId.toString(),
    itemType: item.itemType as "done" | "plan" | "risk",
    content: item.content,
    priority: item.priority as "low" | "medium" | "high",
    needCoordination: item.needCoordination,
    expectedFinishAt: normalizeDateOnlyString(item.expectedFinishAt),
    impactNote: item.impactNote,
    relatedProjectId: item.relatedProjectId,
    relatedOpportunityId: item.relatedOpportunityId,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function serializeReport(report: NonNullable<WeeklyReportRecord>, items: WeeklyReportItemRecord[]) {
  return {
    id: report.id.toString(),
    userId: report.userId,
    weekStart: formatWeekKey(report.weekStart),
    weekEnd: formatWeekKey(report.weekEnd),
    status: report.status as "draft" | "submitted" | "overdue" | "reviewed" | "returned",
    summary: report.summary,
    submittedAt: report.submittedAt,
    lastSavedAt: report.lastSavedAt,
    reviewNote: report.reviewNote,
    reviewedAt: report.reviewedAt,
    reviewedBy: report.reviewedBy,
    returnNote: report.returnNote,
    returnedAt: report.returnedAt,
    returnedBy: report.returnedBy,
    overdueMarkedAt: report.overdueMarkedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    items: items.map(serializeItem)
  };
}

function parseSuggestionPayload(payload: Prisma.JsonValue | null | undefined): SuggestionPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const record = payload as Record<string, unknown>;
  return {
    priority: typeof record.priority === "string" ? record.priority : undefined,
    needCoordination: typeof record.needCoordination === "boolean" ? record.needCoordination : undefined,
    expectedFinishAt: typeof record.expectedFinishAt === "string" ? record.expectedFinishAt : null,
    impactNote: typeof record.impactNote === "string" ? record.impactNote : null
  };
}

function serializeSuggestion(
  suggestion: WeeklyReportSuggestionRecord,
  context?: {
    projectMap?: Map<string, { id: string; code: string; name: string }>;
    opportunityMap?: Map<string, { id: string; code: string; name: string }>;
  }
) {
  const payload = parseSuggestionPayload(suggestion.extraPayload);
  const relatedProject = suggestion.relatedProjectId
    ? context?.projectMap?.get(suggestion.relatedProjectId)
    : undefined;
  const relatedOpportunity = suggestion.relatedOpportunityId
    ? context?.opportunityMap?.get(suggestion.relatedOpportunityId)
    : undefined;

  return {
    id: suggestion.id.toString(),
    sectionType: suggestion.sectionType as "done" | "plan" | "risk",
    sourceType: suggestion.sourceType as keyof typeof weeklyReportSuggestionSourceLabels,
    sourceLabel:
      weeklyReportSuggestionSourceLabels[
        suggestion.sourceType as keyof typeof weeklyReportSuggestionSourceLabels
      ] ?? suggestion.sourceType,
    sourceRef: suggestion.sourceRef,
    reason: suggestion.reason,
    content: suggestion.content,
    relatedProjectId: suggestion.relatedProjectId,
    relatedProject: relatedProject
      ? {
          id: relatedProject.id,
          label: formatCandidateLabel(relatedProject)
        }
      : null,
    relatedOpportunityId: suggestion.relatedOpportunityId,
    relatedOpportunity: relatedOpportunity
      ? {
          id: relatedOpportunity.id,
          label: formatCandidateLabel(relatedOpportunity)
        }
      : null,
    confidenceScore: Number(suggestion.confidenceScore),
    status: suggestion.status as "pending" | "applied" | "ignored",
    priority: (payload.priority ?? "medium") as "low" | "medium" | "high",
    needCoordination: Boolean(payload.needCoordination),
    expectedFinishAt: payload.expectedFinishAt ?? null,
    impactNote: payload.impactNote ?? null,
    createdAt: suggestion.createdAt,
    updatedAt: suggestion.updatedAt
  };
}

export function validateWeeklyReportSubmission(
  items: Array<{
    itemType: string;
    content: string;
    priority?: string | null;
    impactNote?: string | null;
  }>
) {
  const hasDone = items.some((item) => item.itemType === "done" && item.content.trim());
  const hasPlan = items.some((item) => item.itemType === "plan" && item.content.trim());

  if (!hasDone && !hasPlan) {
    throw badRequest("至少填写一条本周完成或下周计划后才能提交");
  }

  const invalidHighRisk = items.find(
    (item) => item.itemType === "risk" && item.priority === "high" && !normalizeNullableString(item.impactNote)
  );
  if (invalidHighRisk) {
    throw badRequest("高风险条目必须填写影响说明后才能提交");
  }
}

export class WeeklyReportService {
  private async getReportItems(reportId: bigint) {
    return (await weeklyReportItemModel.findMany({
      where: { reportId },
      orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { id: "asc" }]
    })) as WeeklyReportItemRecord[];
  }

  private async getSuggestions(userId: string, weekStartDate: Date, statuses?: string[]) {
    return (await weeklyReportSuggestionModel.findMany({
      where: {
        userId,
        weekStart: toDatabaseDate(weekStartDate),
        ...(statuses?.length ? { status: { in: statuses } } : {})
      },
      orderBy: [{ sectionType: "asc" }, { confidenceScore: "desc" }, { id: "asc" }]
    })) as WeeklyReportSuggestionRecord[];
  }

  private async buildSuggestionContext(suggestions: WeeklyReportSuggestionRecord[]) {
    const projectIds = Array.from(
      new Set(suggestions.map((item) => item.relatedProjectId).filter((value): value is string => Boolean(value)))
    );
    const opportunityIds = Array.from(
      new Set(
        suggestions
          .map((item) => item.relatedOpportunityId)
          .filter((value): value is string => Boolean(value))
      )
    );

    const [projects, opportunities] = await Promise.all([
      projectIds.length
        ? prisma.project.findMany({
            where: { id: { in: projectIds }, isDeleted: false },
            select: { id: true, code: true, name: true }
          })
        : Promise.resolve([]),
      opportunityIds.length
        ? prisma.opportunity.findMany({
            where: { id: { in: opportunityIds }, isDeleted: false },
            select: { id: true, code: true, name: true }
          })
        : Promise.resolve([])
    ]);

    return {
      projectMap: new Map(projects.map((item) => [item.id, item])),
      opportunityMap: new Map(opportunities.map((item) => [item.id, item]))
    };
  }

  private buildGeneratedSummary(input: {
    projectCount: number;
    riskCount: number;
    planCount: number;
    suggestionCount: number;
    previousUnfinishedPlanCount: number;
    coordinationCount: number;
  }) {
    const segments = [
      `本周系统识别出 ${input.projectCount} 个活跃项目，形成 ${input.suggestionCount} 条推荐草稿。`,
      `建议重点确认 ${input.planCount} 条下周计划，并持续跟踪 ${input.riskCount} 项风险。`,
      `上周仍有 ${input.previousUnfinishedPlanCount} 条计划待核对，当前涉及 ${input.coordinationCount} 项协同事项，建议优先确认推荐后补充关键进展。`
    ];

    return segments.join("");
  }

  private async buildSuggestionsHelper(input: {
    baseHelper: Awaited<ReturnType<WeeklyReportService["listReportCandidates"]>>["helper"];
    suggestions: WeeklyReportSuggestionRecord[];
  }) {
    const suggestionCount = input.suggestions.filter((item) => item.status === "pending").length;
    const previousUnfinishedPlanCount = input.suggestions.filter(
      (item) => item.status === "pending" && item.sourceType === "last_week_plan"
    ).length;
    const ongoingRiskCount = input.suggestions.filter(
      (item) => item.status === "pending" && item.sourceType === "ongoing_risk"
    ).length;
    const generationBasis = Object.values(weeklyReportSuggestionSourceLabels)
      .map((label, index) => {
        const sourceType = Object.keys(weeklyReportSuggestionSourceLabels)[index];
        const count = input.suggestions.filter(
          (item) => item.status === "pending" && item.sourceType === sourceType
        ).length;
        return {
          sourceType,
          label,
          count
        };
      })
      .filter((item) => item.count > 0);
    const generatedSummary = this.buildGeneratedSummary({
      projectCount: input.baseHelper.weeklyProjectCount,
      riskCount: ongoingRiskCount,
      planCount: input.suggestions.filter(
        (item) => item.status === "pending" && item.sectionType === "plan"
      ).length,
      suggestionCount,
      previousUnfinishedPlanCount,
      coordinationCount: input.suggestions.filter(
        (item) => item.status === "pending" && item.sourceType === "coordination"
      ).length
    });

    return {
      ...input.baseHelper,
      suggestionCount,
      previousUnfinishedPlanCount,
      ongoingRiskCount,
      generatedSummary,
      generationBasis
    };
  }

  private buildSuggestionSeedKey(seed: {
    sectionType: string;
    sourceType: string;
    sourceRef?: string | null;
    content: string;
  }) {
    return [seed.sectionType, seed.sourceType, seed.sourceRef ?? "", seed.content.trim()].join("::");
  }

  private async getSerializedReportById(reportId: bigint) {
    const report = (await weeklyReportModel.findUnique({ where: { id: reportId } })) as WeeklyReportRecord | null;
    if (!report) {
      throw notFound("周报不存在");
    }
    const items = await this.getReportItems(reportId);
    return serializeReport(report, items);
  }

  async getOrCreateCurrentWeeklyReport(userId: string) {
    return this.getOrCreateWeeklyReportByWeek(userId, getNaturalWeekRange().weekStart);
  }

  async getOrCreateWeeklyReportByWeek(userId: string, weekStartDate: Date) {
    const range = getNaturalWeekRange(weekStartDate);
    const dbWeekStart = toDatabaseDate(range.weekStart);
    const dbWeekEnd = toDatabaseDate(range.weekEnd);

    let report = (await weeklyReportModel.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart: dbWeekStart
        }
      }
    })) as WeeklyReportRecord | null;

    if (!report) {
      report = (await weeklyReportModel
        .create({
          data: {
            userId,
            weekStart: dbWeekStart,
            weekEnd: dbWeekEnd,
            status: "draft",
            lastSavedAt: new Date()
          }
        })
        .catch(async (error: unknown) => {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return weeklyReportModel.findUnique({
              where: {
                userId_weekStart: {
                  userId,
                  weekStart: dbWeekStart
                }
              }
            });
          }

          throw error;
        })) as WeeklyReportRecord | null;

      if (!report) {
        throw badRequest("周报初始化失败，请刷新后重试");
      }

      await logWeeklyReportAudit({
        action: "create",
        entityType: "weekly_report",
        entityId: report.id.toString(),
        operatorUserId: userId
      });
    }

    return this.getSerializedReportById(report.id);
  }

  async getWeeklyReportByWeek(userId: string, weekStart: string) {
    const range = parseWeekStart(weekStart);
    return this.getOrCreateWeeklyReportByWeek(userId, range.weekStart);
  }

  async getReportById(reportId: string, user: SessionUser) {
    assertCanAccessRecord(user, "weeklyReport", "view");
    const report = (await weeklyReportModel.findUnique({
      where: { id: toReportId(reportId) }
    })) as WeeklyReportRecord | null;

    if (!report) {
      throw notFound("周报不存在");
    }

    if (report.userId !== user.id && !canManageWeeklyReport(user)) {
      throw forbidden("只能查看自己的周报");
    }

    return this.getSerializedReportById(report.id);
  }

  async getPreviousWeeklyReport(userId: string, weekStart: string) {
    const currentRange = parseWeekStart(weekStart);
    const previousWeekStart = subWeeks(currentRange.weekStart, 1);
    const report = (await weeklyReportModel.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart: toDatabaseDate(previousWeekStart)
        }
      }
    })) as WeeklyReportRecord | null;

    if (!report) {
      return null;
    }

    const items = await this.getReportItems(report.id);
    return serializeReport(report, items);
  }

  async listReportCandidates(userId: string, weekStart: Date, weekEnd: Date) {
    const previousReport = await this.getPreviousWeeklyReport(userId, formatWeekKey(weekStart));
    const previousProjectIds = Array.from(
      new Set(
        (previousReport?.items ?? [])
          .map((item) => normalizeNullableString(item.relatedProjectId))
          .filter((value): value is string => Boolean(value))
      )
    );

    const [relatedProjects, recentProjects, previousProjects, relatedOpportunities, recentOpportunities, weeklyUpdateCount, recentProjectAuditRefs] = await Promise.all([
      prisma.project.findMany({
        where: {
          isDeleted: false,
          OR: [
            { createdBy: userId },
            { updatedBy: userId },
            {
              costs: {
                some: {
                  createdBy: userId,
                  isDeleted: false,
                  occurredAt: { gte: weekStart, lte: weekEnd }
                }
              }
            },
            {
              receivables: {
                some: {
                  createdBy: userId,
                  isDeleted: false,
                  receivedDate: { gte: weekStart, lte: weekEnd }
                }
              }
            }
          ]
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          code: true,
          name: true
        }
      }),
      prisma.project.findMany({
        where: { isDeleted: false },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          code: true,
          name: true
        }
      }),
      previousProjectIds.length
        ? prisma.project.findMany({
            where: {
              isDeleted: false,
              id: { in: previousProjectIds }
            },
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              code: true,
              name: true
            }
          })
        : Promise.resolve([]),
      prisma.opportunity.findMany({
        where: {
          isDeleted: false,
          OR: [{ createdBy: userId }, { updatedBy: userId }]
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          code: true,
          name: true
        }
      }),
      prisma.opportunity.findMany({
        where: { isDeleted: false },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          code: true,
          name: true
        }
      }),
      prisma.auditLog.count({
        where: {
          actorId: userId,
          createdAt: { gte: weekStart, lte: weekEnd },
          action: { not: "LOGIN" }
        }
      }),
      prisma.auditLog.findMany({
        where: {
          actorId: userId,
          entityType: EntityType.PROJECT
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          entityId: true
        }
      })
    ]);

    const mergeCandidates = <T extends { id: string; code: string; name: string }>(items: T[]) =>
      Array.from(new Map(items.map((item) => [item.id, item])).values()).slice(0, 20);

    const projects = mergeCandidates([...relatedProjects, ...recentProjects]);
    const opportunities = mergeCandidates([...relatedOpportunities, ...recentOpportunities]);
    const recentOperatedProjectIds = Array.from(
      new Set(recentProjectAuditRefs.map((item: { entityId: string }) => item.entityId).filter(Boolean))
    );
    const recommendationProjects = mergeCandidates([
      ...relatedProjects,
      ...previousProjects,
      ...recentProjects.filter((item) => recentOperatedProjectIds.includes(item.id)),
      ...recentProjects
    ]).slice(0, 3);

    return {
      projects: projects.map((item) => ({
        id: item.id,
        label: formatCandidateLabel(item)
      })),
      opportunities: opportunities.map((item) => ({
        id: item.id,
        label: formatCandidateLabel(item)
      })),
      helper: {
        weeklyProjectCount: relatedProjects.length,
        weeklyUpdateCount,
        recommendedProjects: recommendationProjects.map((item) => ({
          id: item.id,
          label: formatCandidateLabel(item)
        }))
      }
    };
  }

  async getCurrentReportPayload(user: SessionUser) {
    assertCanAccessRecord(user, "weeklyReport", "view");
    const report = await this.getOrCreateCurrentWeeklyReport(user.id);
    const range = parseWeekStart(report.weekStart);
    const [candidates, previousReport] = await Promise.all([
      this.listReportCandidates(user.id, range.weekStart, range.weekEnd),
      this.getPreviousWeeklyReport(user.id, report.weekStart)
    ]);

    return {
      report,
      items: report.items,
      previousReport,
      relatedProjectsCandidates: candidates.projects,
      relatedOpportunitiesCandidates: candidates.opportunities
    };
  }

  async getWeeklyReportWorkbench(user: SessionUser, week: string) {
    assertCanAccessRecord(user, "weeklyReport", "view");
    const report = await this.getWeeklyReportByWeek(user.id, week);
    const range = parseWeekStart(report.weekStart);
    const [candidates, previousReport, suggestions] = await Promise.all([
      this.listReportCandidates(user.id, range.weekStart, range.weekEnd),
      this.getPreviousWeeklyReport(user.id, report.weekStart),
      this.getSuggestions(user.id, range.weekStart)
    ]);
    const suggestionContext = await this.buildSuggestionContext(suggestions);
    const helper = await this.buildSuggestionsHelper({
      baseHelper: candidates.helper,
      suggestions
    });

    return {
      report,
      items: report.items,
      previousReport,
      relatedProjectsCandidates: candidates.projects,
      relatedOpportunitiesCandidates: candidates.opportunities,
      helper,
      suggestions: suggestions.map((item) => serializeSuggestion(item, suggestionContext))
    };
  }

  async getCurrentSuggestions(user: SessionUser, week?: string) {
    const resolvedWeek = week ?? formatWeekKey(getNaturalWeekRange().weekStart);
    const workbench = await this.getWeeklyReportWorkbench(user, resolvedWeek);
    return {
      weekStart: workbench.report.weekStart,
      suggestions: workbench.suggestions,
      helper: workbench.helper
    };
  }

  async generateSuggestions(user: SessionUser, payload: GenerateWeeklyReportSuggestionsDto) {
    assertCanAccessRecord(user, "weeklyReport", "view");
    const resolvedWeek = payload.week ?? formatWeekKey(getNaturalWeekRange().weekStart);
    const report = await this.getWeeklyReportByWeek(user.id, resolvedWeek);
    const range = parseWeekStart(report.weekStart);
    const existingItems = report.items;
    const currentTextSet = new Set(existingItems.map((item) => item.content.trim()));
    const previousReport = await this.getPreviousWeeklyReport(user.id, report.weekStart);
    const currentSuggestions = await this.getSuggestions(user.id, range.weekStart);
    const historyKeys = new Set(
      currentSuggestions
        .filter((item) => item.status !== "pending")
        .map((item) =>
          this.buildSuggestionSeedKey({
            sectionType: item.sectionType,
            sourceType: item.sourceType,
            sourceRef: item.sourceRef,
            content: item.content
          })
        )
    );
    const candidates = await this.listReportCandidates(user.id, range.weekStart, range.weekEnd);
    const role = user.role;
    const relatedProjectMap = new Map(candidates.projects.map((item) => [item.id, item.label]));

    const previousPlans = (previousReport?.items ?? []).filter((item) => item.itemType === "plan");
    const previousRisks = (previousReport?.items ?? []).filter((item) => item.itemType === "risk");
    const coordinationItems = (previousReport?.items ?? []).filter((item) => item.needCoordination);

    const projectSuggestions: Array<any> = candidates.helper.recommendedProjects.flatMap((project) => {
      const label = relatedProjectMap.get(project.id) ?? project.label;
      return [
        {
          sectionType: "done",
          sourceType: "project_update",
          sourceRef: project.id,
          reason: "本周项目存在活动记录，建议补充已完成事项",
          content: `${label} 本周有项目活动，可补充本周完成内容`,
          relatedProjectId: project.id,
          relatedOpportunityId: null,
          confidenceScore: new Prisma.Decimal(0.78),
          extraPayload: { priority: "medium", needCoordination: false }
        },
        {
          sectionType: "plan",
          sourceType: "active_project",
          sourceRef: project.id,
          reason:
            role === "PROJECT_MANAGER" ? "结合活跃项目，建议明确下周动作与推进重点" : "结合活跃项目，建议确认下周推进计划",
          content:
            role === "PROJECT_MANAGER"
              ? `围绕 ${label} 明确下周动作、风险跟进和资源安排`
              : `继续推进 ${label} 的下周工作安排`,
          relatedProjectId: project.id,
          relatedOpportunityId: null,
          confidenceScore: new Prisma.Decimal(role === "PROJECT_MANAGER" ? 0.83 : 0.74),
          extraPayload: { priority: "medium", needCoordination: false }
        }
      ];
    });

    const seeds: Array<any> = [
      ...previousPlans
        .filter((item) => !currentTextSet.has(item.content.trim()))
        .map((item) => ({
          sectionType: "plan",
          sourceType: "last_week_plan",
          sourceRef: item.id,
          reason: "来自上周计划，建议确认是否继续推进",
          content: item.content,
          relatedProjectId: item.relatedProjectId,
          relatedOpportunityId: role === "SALES" ? item.relatedOpportunityId : null,
          confidenceScore: new Prisma.Decimal(0.92),
          extraPayload: {
            priority: item.priority,
            needCoordination: item.needCoordination,
            expectedFinishAt: item.expectedFinishAt,
            impactNote: item.impactNote
          }
        })),
      ...previousRisks
        .filter((item) => !currentTextSet.has(item.content.trim()))
        .map((item) => ({
          sectionType: "risk",
          sourceType: "ongoing_risk",
          sourceRef: item.id,
          reason: "来自持续风险，建议确认是否仍需跟踪",
          content: item.content,
          relatedProjectId: item.relatedProjectId,
          relatedOpportunityId: role === "SALES" ? item.relatedOpportunityId : null,
          confidenceScore: new Prisma.Decimal(0.88),
          extraPayload: {
            priority: item.priority,
            needCoordination: item.needCoordination,
            impactNote: item.impactNote
          }
        })),
      ...coordinationItems
        .filter((item) => !currentTextSet.has(item.content.trim()))
        .map((item) => ({
          sectionType: "plan",
          sourceType: "coordination",
          sourceRef: item.id,
          reason: "来自协同事项，建议确认协同是否需要延续到本周",
          content: `继续跟进协同事项：${item.content}`,
          relatedProjectId: item.relatedProjectId,
          relatedOpportunityId: null,
          confidenceScore: new Prisma.Decimal(0.76),
          extraPayload: {
            priority: item.priority,
            needCoordination: true
          }
        })),
      ...projectSuggestions
    ];

    if (role === "SALES") {
      const opportunities = await prisma.opportunity.findMany({
        where: {
          isDeleted: false,
          OR: [{ createdBy: user.id }, { updatedBy: user.id }],
          updatedAt: { gte: range.weekStart, lte: range.weekEnd }
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, code: true, name: true }
      });

      seeds.push(
        ...opportunities.map((item) => ({
          sectionType: "plan",
          sourceType: "opportunity_update",
          sourceRef: item.id,
          reason: "来自本周商机推进，建议确认下周商务动作",
          content: `推进 ${formatCandidateLabel(item)} 的下阶段商务动作`,
          relatedProjectId: null,
          relatedOpportunityId: item.id,
          confidenceScore: new Prisma.Decimal(0.81),
          extraPayload: {
            priority: "medium",
            needCoordination: false
          }
        }))
      );
    }

    const dedupedSeeds = Array.from(
      new Map(
      (seeds as Array<any>)
          .filter((seed) => !historyKeys.has(this.buildSuggestionSeedKey(seed)))
          .map((seed) => [this.buildSuggestionSeedKey(seed), seed] as const)
      ).values()
    );

    await prisma.$transaction(async (tx) => {
      await ((tx as any).weeklyReportSuggestion as any).deleteMany({
        where: {
          userId: user.id,
          weekStart: toDatabaseDate(range.weekStart),
          status: "pending"
        }
      });

      if (dedupedSeeds.length) {
        await (((tx as any).weeklyReportSuggestion as any)).createMany({
          data: dedupedSeeds.map((seed) => ({
            userId: user.id,
            weekStart: toDatabaseDate(range.weekStart),
            sectionType: seed.sectionType,
            sourceType: seed.sourceType,
            sourceRef: seed.sourceRef ? String(seed.sourceRef) : null,
            reason: seed.reason,
            content: seed.content,
            relatedProjectId: seed.relatedProjectId,
            relatedOpportunityId: seed.relatedOpportunityId,
            confidenceScore: seed.confidenceScore,
            status: "pending",
            extraPayload: seed.extraPayload ? seed.extraPayload : Prisma.JsonNull
          }))
        });
      }
    });

    await logWeeklyReportAudit({
      action: "generate_suggestions",
      entityType: "weekly_report",
      entityId: report.id,
      operatorUserId: user.id
    });

    return this.getWeeklyReportWorkbench(user, report.weekStart);
  }

  async applySuggestions(user: SessionUser, payload: ApplyWeeklyReportSuggestionsDto) {
    assertCanAccessRecord(user, "weeklyReport", "update");
    const resolvedWeek = payload.week ?? formatWeekKey(getNaturalWeekRange().weekStart);
    const report = await this.getWeeklyReportByWeek(user.id, resolvedWeek);
    const range = parseWeekStart(report.weekStart);
    const suggestions = await this.getSuggestions(user.id, range.weekStart, ["pending"]);
    const targetSuggestions = payload.applyAll
      ? suggestions
      : suggestions.filter((item) => payload.suggestionIds?.includes(item.id.toString()));

    if (!targetSuggestions.length) {
      throw badRequest("没有可采用的推荐条目");
    }

    const overridesMap = new Map((payload.overrides ?? []).map((item) => [item.id, item]));
    const existingItems = await this.getReportItems(BigInt(report.id));
    const currentMaxSortOrder = existingItems.reduce((max, item) => Math.max(max, item.sortOrder), -1);
    const existingKeys = new Set(
      existingItems.map((item) => `${item.itemType}::${item.content.trim()}::${item.relatedProjectId ?? ""}`)
    );

    await prisma.$transaction(async (tx) => {
      const toCreate = targetSuggestions
        .map((suggestion, index) => {
          const payloadData = parseSuggestionPayload(suggestion.extraPayload);
          const override = overridesMap.get(suggestion.id.toString());
          const content = override?.content?.trim() || suggestion.content.trim();
          const relatedProjectId = normalizeNullableString(override?.relatedProjectId) ?? suggestion.relatedProjectId;
          const uniqueKey = `${suggestion.sectionType}::${content}::${relatedProjectId ?? ""}`;

          if (existingKeys.has(uniqueKey)) {
            return null;
          }
          existingKeys.add(uniqueKey);

          return {
            reportId: BigInt(report.id),
            itemType: suggestion.sectionType,
            content,
            priority: override?.priority ?? payloadData.priority ?? "medium",
            needCoordination: override?.needCoordination ?? payloadData.needCoordination ?? false,
            expectedFinishAt:
              suggestion.sectionType === "plan"
                ? (() => {
                    const candidateDate =
                      override?.expectedFinishAt ??
                      (payloadData.expectedFinishAt
                        ? new Date(`${payloadData.expectedFinishAt}T00:00:00.000Z`)
                        : range.weekEnd);
                    return candidateDate ? toDatabaseDate(candidateDate) : null;
                  })()
                : null,
            impactNote: normalizeNullableString(override?.impactNote) ?? normalizeNullableString(payloadData.impactNote),
            relatedProjectId,
            relatedOpportunityId:
              normalizeNullableString(override?.relatedOpportunityId) ?? suggestion.relatedOpportunityId,
            sortOrder: currentMaxSortOrder + index + 1
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (toCreate.length) {
        await (((tx as any).weeklyReportItem as any)).createMany({
          data: toCreate
        });
      }

      await (((tx as any).weeklyReportSuggestion as any)).updateMany({
        where: {
          id: { in: targetSuggestions.map((item) => item.id) }
        },
        data: {
          status: "applied"
        }
      });
    });

    await Promise.all(
      targetSuggestions.map((item) =>
        logWeeklyReportAudit({
          action: "apply_suggestion",
          entityType: "weekly_report_suggestion",
          entityId: item.id.toString(),
          operatorUserId: user.id
        })
      )
    );

    return this.getWeeklyReportWorkbench(user, report.weekStart);
  }

  async ignoreSuggestions(user: SessionUser, payload: IgnoreWeeklyReportSuggestionsDto) {
    assertCanAccessRecord(user, "weeklyReport", "update");
    const resolvedWeek = payload.week ?? formatWeekKey(getNaturalWeekRange().weekStart);
    const range = parseWeekStart(resolvedWeek);
    const suggestions = await this.getSuggestions(user.id, range.weekStart, ["pending"]);
    const targetSuggestions = suggestions.filter((item) => payload.suggestionIds.includes(item.id.toString()));

    if (!targetSuggestions.length) {
      throw badRequest("没有可忽略的推荐条目");
    }

    await weeklyReportSuggestionModel.updateMany({
      where: {
        id: { in: targetSuggestions.map((item) => item.id) }
      },
      data: {
        status: "ignored"
      }
    });

    await Promise.all(
      targetSuggestions.map((item) =>
        logWeeklyReportAudit({
          action: "ignore_suggestion",
          entityType: "weekly_report_suggestion",
          entityId: item.id.toString(),
          operatorUserId: user.id
        })
      )
    );

    return this.getWeeklyReportWorkbench(user, resolvedWeek);
  }

  async saveDraft(reportId: string, userId: string, payload: SaveWeeklyReportDraftDto) {
    const parsedReportId = toReportId(reportId);
    const report = (await weeklyReportModel.findUnique({
      where: { id: parsedReportId }
    })) as WeeklyReportRecord | null;

    if (!report) {
      throw notFound("周报不存在");
    }

    if (report.userId !== userId) {
      throw forbidden("只能修改自己的周报");
    }

    if (!isEditableStatus(report.status)) {
      throw badRequest("当前状态不可修改");
    }

    const itemProjectIds = payload.items
      .map((item) => normalizeNullableString(item.relatedProjectId))
      .filter((value): value is string => Boolean(value));
    const itemOpportunityIds = payload.items
      .map((item) => normalizeNullableString(item.relatedOpportunityId))
      .filter((value): value is string => Boolean(value));

    const [projectCount, opportunityCount] = await Promise.all([
      itemProjectIds.length
        ? prisma.project.count({
            where: { id: { in: Array.from(new Set(itemProjectIds)) }, isDeleted: false }
          })
        : Promise.resolve(0),
      itemOpportunityIds.length
        ? prisma.opportunity.count({
            where: { id: { in: Array.from(new Set(itemOpportunityIds)) }, isDeleted: false }
          })
        : Promise.resolve(0)
    ]);

    if (itemProjectIds.length && projectCount !== new Set(itemProjectIds).size) {
      throw badRequest("存在无效的关联项目");
    }

    if (itemOpportunityIds.length && opportunityCount !== new Set(itemOpportunityIds).size) {
      throw badRequest("存在无效的关联商机");
    }

    const existingItems = (await weeklyReportItemModel.findMany({
      where: { reportId: parsedReportId },
      select: { id: true }
    })) as Array<{ id: bigint }>;
    const existingItemIdSet = new Set(existingItems.map((item) => item.id.toString()));
    const newItemIds = new Set(
      payload.items
        .map((item) => item.id)
        .filter((itemId): itemId is string => Boolean(itemId))
    );
    const deletedItems = existingItems.filter((item) => !newItemIds.has(item.id.toString()));
    const invalidItemId = Array.from(newItemIds).find((itemId) => !existingItemIdSet.has(itemId));

    if (invalidItemId) {
      throw badRequest("存在无效的周报条目");
    }

    await prisma.$transaction(async (tx) => {
      await (tx.weeklyReport as any).update({
        where: { id: parsedReportId },
        data: {
          summary: normalizeNullableString(payload.summary),
          lastSavedAt: new Date()
        }
      });

      if (deletedItems.length) {
        await (tx.weeklyReportItem as any).deleteMany({
          where: { id: { in: deletedItems.map((item) => item.id) } }
        });
      }

      const itemsToUpdate = payload.items.filter((item) => item.id);
      for (const [index, item] of itemsToUpdate.entries()) {
        await (tx.weeklyReportItem as any).update({
          where: { id: BigInt(item.id!) },
          data: buildDraftItemWrite(item, index)
        });
      }

      const itemsToCreate = payload.items.filter((item) => !item.id);
      if (itemsToCreate.length) {
        await (tx.weeklyReportItem as any).createMany({
          data: itemsToCreate.map((item, index) => ({
            reportId: parsedReportId,
            ...buildDraftItemWrite(item, itemsToUpdate.length + index)
          }))
        });
      }
    });

    await logWeeklyReportAudit({
      action: "update",
      entityType: "weekly_report",
      entityId: reportId,
      operatorUserId: userId
    });

    await Promise.all(
      deletedItems.map((item) =>
        logWeeklyReportAudit({
          action: "delete_item",
          entityType: "weekly_report_item",
          entityId: item.id.toString(),
          operatorUserId: userId
        })
      )
    );

    return this.getSerializedReportById(parsedReportId);
  }

  async submitReport(reportId: string, userId: string) {
    const parsedReportId = toReportId(reportId);
    const report = (await weeklyReportModel.findUnique({
      where: { id: parsedReportId }
    })) as WeeklyReportRecord | null;

    if (!report) {
      throw notFound("周报不存在");
    }

    if (report.userId !== userId) {
      throw forbidden("只能提交自己的周报");
    }

    if (!isEditableStatus(report.status)) {
      throw badRequest("当前周报状态不可提交");
    }

    const items = (await weeklyReportItemModel.findMany({
      where: { reportId: parsedReportId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
    })) as WeeklyReportItemRecord[];
    validateWeeklyReportSubmission(items);

    await weeklyReportModel.update({
      where: { id: parsedReportId },
      data: {
        status: "submitted",
        submittedAt: new Date()
      }
    });

    await weeklyTaskService.syncTasksForSubmittedReport({
      reportId: parsedReportId,
      userId,
      items
    });

    await logWeeklyReportAudit({
      action: "submit",
      entityType: "weekly_report",
      entityId: reportId,
      operatorUserId: userId
    });

    return this.getSerializedReportById(parsedReportId);
  }

  async copyPreviousWeek(reportId: string, userId: string) {
    const parsedReportId = toReportId(reportId);
    const report = (await weeklyReportModel.findUnique({ where: { id: parsedReportId } })) as WeeklyReportRecord | null;

    if (!report) {
      throw notFound("周报不存在");
    }
    if (report.userId !== userId) {
      throw forbidden("只能复制到自己的周报");
    }
    if (!isEditableStatus(report.status)) {
      throw badRequest("当前状态不可复制上周内容");
    }

    const previous = await this.getPreviousWeeklyReport(userId, formatWeekKey(report.weekStart));
    if (!previous) {
      throw badRequest("上周暂无可复制的周报");
    }

    await prisma.$transaction(async (tx) => {
      await (tx.weeklyReport as any).update({
        where: { id: parsedReportId },
        data: {
          summary: normalizeNullableString(report.summary) || normalizeNullableString(previous.summary),
          lastSavedAt: new Date()
        }
      });

      await (tx.weeklyReportItem as any).deleteMany({
        where: { reportId: parsedReportId }
      });

      if (previous.items.length) {
        await (tx.weeklyReportItem as any).createMany({
          data: previous.items.map((item, index) => ({
            reportId: parsedReportId,
            itemType: item.itemType,
            content: item.content,
            priority: item.priority,
            needCoordination: item.needCoordination,
            expectedFinishAt:
              item.itemType === "plan" && item.expectedFinishAt ? toDatabaseDate(new Date(`${item.expectedFinishAt}T00:00:00.000Z`)) : null,
            impactNote: normalizeNullableString(item.impactNote),
            relatedProjectId: normalizeNullableString(item.relatedProjectId),
            relatedOpportunityId: normalizeNullableString(item.relatedOpportunityId),
            sortOrder: index
          }))
        });
      }
    });

    await logWeeklyReportAudit({
      action: "copy_previous",
      entityType: "weekly_report",
      entityId: reportId,
      operatorUserId: userId
    });

    return this.getSerializedReportById(parsedReportId);
  }

  async reviewReport(reportId: string, user: SessionUser, payload: ReviewWeeklyReportDto) {
    assertCanManageWeeklyReport(user);
    const parsedReportId = toReportId(reportId);
    const report = (await weeklyReportModel.findUnique({ where: { id: parsedReportId } })) as WeeklyReportRecord | null;

    if (!report) {
      throw notFound("周报不存在");
    }
    if (!["submitted", "overdue"].includes(report.status)) {
      throw badRequest("仅已提交或逾期待补周报可审阅");
    }

    await weeklyReportModel.update({
      where: { id: parsedReportId },
      data: {
        status: "reviewed",
        reviewNote: normalizeNullableString(payload.reviewNote),
        reviewedAt: new Date(),
        reviewedBy: user.id
      }
    });

    await logWeeklyReportAudit({
      action: "review",
      entityType: "weekly_report",
      entityId: reportId,
      operatorUserId: user.id
    });

    return this.getReportById(reportId, user);
  }

  async returnReport(reportId: string, user: SessionUser, payload: ReturnWeeklyReportDto) {
    assertCanManageWeeklyReport(user);
    const parsedReportId = toReportId(reportId);
    const report = (await weeklyReportModel.findUnique({ where: { id: parsedReportId } })) as WeeklyReportRecord | null;

    if (!report) {
      throw notFound("周报不存在");
    }
    if (!["submitted", "reviewed", "overdue"].includes(report.status)) {
      throw badRequest("当前周报状态不可退回");
    }

    await weeklyReportModel.update({
      where: { id: parsedReportId },
      data: {
        status: "returned",
        returnNote: payload.returnNote.trim(),
        returnedAt: new Date(),
        returnedBy: user.id
      }
    });

    await logWeeklyReportAudit({
      action: "return",
      entityType: "weekly_report",
      entityId: reportId,
      operatorUserId: user.id
    });

    return this.getReportById(reportId, user);
  }

  async listReportsForWeek(week: string, user: SessionUser) {
    assertCanManageWeeklyReport(user);
    const range = parseWeekStart(week);
    const weekStart = toDatabaseDate(range.weekStart);
    const [reports, activeUsers, reminders] = (await Promise.all([
      weeklyReportModel.findMany({
        where: { weekStart },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
      }),
      prisma.user.findMany({
        where: { isActive: true, isDeleted: false },
        select: { id: true, name: true, username: true }
      }),
      weeklyReportReminderModel.findMany({
        where: { weekStart },
        select: { targetUserId: true, remindedAt: true }
      })
    ])) as [
      WeeklyReportRecord[],
      Array<{ id: string; name: string; username: string }>,
      Array<{ targetUserId: string; remindedAt: Date }>
    ];

    const reportIds = reports.map((item: WeeklyReportRecord) => item.id);
    const items = reportIds.length
      ? ((await weeklyReportItemModel.findMany({
          where: { reportId: { in: reportIds } },
          select: {
            reportId: true,
            needCoordination: true,
            itemType: true,
            priority: true
          }
        })) as Array<{ reportId: bigint; needCoordination: boolean; itemType: string; priority: string }>)
      : [];
    const reminderMap = new Map<string, Date>();
    reminders.forEach((item: { targetUserId: string; remindedAt: Date }) => {
      const existing = reminderMap.get(item.targetUserId);
      if (!existing || existing < item.remindedAt) {
        reminderMap.set(item.targetUserId, item.remindedAt);
      }
    });
    const itemMap = new Map<string, Array<{ needCoordination: boolean; itemType: string; priority: string }>>();
    items.forEach((item: { reportId: bigint; needCoordination: boolean; itemType: string; priority: string }) => {
      const key = item.reportId.toString();
      const current = itemMap.get(key) ?? [];
      current.push(item);
      itemMap.set(key, current);
    });
    const reportMap = new Map(reports.map((item: WeeklyReportRecord) => [item.userId, item] as const));
    const taskCounter = await weeklyTaskService.countOpenTasksByAssignee(activeUsers.map((item) => item.id));

    return activeUsers.map((userItem: { id: string; name: string; username: string }) => {
      const report = reportMap.get(userItem.id);
      const relatedItems = report ? itemMap.get(report.id.toString()) ?? [] : [];
      return {
        userId: userItem.id,
        userName: userItem.name,
        username: userItem.username,
        reportId: report?.id.toString() ?? null,
        status: (report?.status ?? "overdue") as "draft" | "submitted" | "overdue" | "reviewed" | "returned",
        submittedAt: report?.submittedAt ?? null,
        reviewedAt: report?.reviewedAt ?? null,
        lastSavedAt: report?.lastSavedAt ?? null,
        needCoordinationCount: relatedItems.filter((item) => item.needCoordination).length,
        highRiskCount: relatedItems.filter((item) => item.itemType === "risk" && item.priority === "high").length,
        openTaskCount: taskCounter.get(userItem.id) ?? 0,
        reportHref: report ? `/management/weekly-summary/${week}/reports/${report.id.toString()}` : null,
        lastRemindedAt: reminderMap.get(userItem.id) ?? null
      };
    });
  }

  async remindWeeklyReports(week: string, actor: SessionUser, payload: RemindWeeklyReportDto) {
    assertCanManageWeeklyReport(actor);
    const rows = await this.listReportsForWeek(week, actor);
    const targets = rows.filter((row) =>
      payload.targetUserIds?.length
        ? payload.targetUserIds.includes(row.userId)
        : !["submitted", "reviewed"].includes(row.status)
    );
    if (!targets.length) {
      throw badRequest("没有可催办的人员");
    }

    const weekStart = toDatabaseDate(parseWeekStart(week).weekStart);
    await weeklyReportReminderModel.createMany({
      data: targets.map((item: { reportId: string | null; userId: string }) => ({
        weekStart,
        reportId: item.reportId ? BigInt(item.reportId) : null,
        targetUserId: item.userId,
        message: normalizeNullableString(payload.message),
        remindedBy: actor.id,
        status: "pending"
      }))
    });

    await Promise.all(
      targets.map((item) =>
        logWeeklyReportAudit({
          action: "remind",
          entityType: "weekly_report_reminder",
          entityId: item.reportId ?? `${item.userId}:${week}`,
          operatorUserId: actor.id
        })
      )
    );

    return {
      remindedCount: targets.length,
      recipients: targets.map((item) => ({
        userId: item.userId,
        userName: item.userName,
        reportId: item.reportId
      })),
      queued: false
    };
  }

  async markOverdueReports(baseDate = new Date()) {
    const currentWeekStart = toDatabaseDate(getNaturalWeekRange(baseDate).weekStart);
    const updated = await weeklyReportModel.updateMany({
      where: {
        status: { in: ["draft", "returned"] },
        weekEnd: { lt: currentWeekStart }
      },
      data: {
        status: "overdue",
        overdueMarkedAt: new Date()
      }
    });

    return { updatedCount: updated.count };
  }

  async precreateDraftsForActiveUsers(baseDate = new Date()) {
    await this.markOverdueReports(baseDate);
    const range = getNaturalWeekRange(baseDate);
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        isDeleted: false
      },
      select: { id: true }
    });

    for (const user of users) {
      await weeklyReportModel.upsert({
        where: {
          userId_weekStart: {
            userId: user.id,
            weekStart: toDatabaseDate(range.weekStart)
          }
        },
        update: {},
        create: {
          userId: user.id,
          weekStart: toDatabaseDate(range.weekStart),
          weekEnd: toDatabaseDate(range.weekEnd),
          status: "draft",
          lastSavedAt: new Date()
        }
      });
    }

    return {
      weekStart: formatWeekKey(range.weekStart),
      createdUsers: users.length
    };
  }

  summarizeItems(items: Array<{ itemType: string; content: string }>) {
    const grouped = {
      done: items.filter((item) => item.itemType === "done").length,
      plan: items.filter((item) => item.itemType === "plan").length,
      risk: items.filter((item) => item.itemType === "risk").length
    };

    return Object.entries(grouped)
      .filter(([, count]) => count > 0)
      .map(
        ([key, count]) =>
          `${weeklyReportItemTypeLabels[key as keyof typeof weeklyReportItemTypeLabels]} ${count} 条`
      )
      .join("；");
  }
}

export const weeklyReportService = new WeeklyReportService();

export function serializeWeeklySnapshotRecord(snapshot: {
  id: bigint;
  projectId: string;
  weekStart: Date;
  weekEnd: Date;
  progressSummary: string | null;
  costDelta: Prisma.Decimal | number;
  receivableDelta: Prisma.Decimal | number;
  riskFlag: boolean;
  riskCount: number;
  trafficLightStatus: string;
  weeklyActions: string | null;
  ownerNote: string | null;
  generatedAt: Date;
  updatedAt: Date;
}) {
  return {
    id: snapshot.id.toString(),
    projectId: snapshot.projectId,
    weekStart: formatWeekKey(snapshot.weekStart),
    weekEnd: formatWeekKey(snapshot.weekEnd),
    progressSummary: snapshot.progressSummary,
    costDelta: Number(snapshot.costDelta ?? 0),
    receivableDelta: Number(snapshot.receivableDelta ?? 0),
    riskFlag: snapshot.riskFlag,
    riskCount: snapshot.riskCount,
    trafficLightStatus: snapshot.trafficLightStatus as "green" | "yellow" | "red",
    weeklyActions: snapshot.weeklyActions,
    ownerNote: snapshot.ownerNote,
    generatedAt: snapshot.generatedAt,
    updatedAt: snapshot.updatedAt
  };
}
