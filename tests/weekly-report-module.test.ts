import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStatus } from "@prisma/client";

const mockPrisma = vi.hoisted(() => ({
  weeklyReport: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn()
  },
  weeklyReportItem: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn()
  },
  weeklyReportAuditRef: {
    create: vi.fn()
  },
  weeklyReportReminder: {
    findMany: vi.fn(),
    createMany: vi.fn()
  },
  weeklyReportSuggestion: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn()
  },
  weeklyTask: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn()
  },
  project: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  opportunity: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  user: {
    findMany: vi.fn(),
    count: vi.fn()
  },
  auditLog: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  cost: {
    aggregate: vi.fn(),
    groupBy: vi.fn()
  },
  receivable: {
    aggregate: vi.fn(),
    groupBy: vi.fn()
  },
  projectWeeklySnapshot: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn()
  },
  $transaction: vi.fn(async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma))
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

function createReport(id = 1n, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId: "user-1",
    weekStart: new Date("2026-04-13T00:00:00.000Z"),
    weekEnd: new Date("2026-04-19T00:00:00.000Z"),
    status: "draft",
    summary: null,
    submittedAt: null,
    lastSavedAt: new Date("2026-04-13T09:00:00.000Z"),
    reviewNote: null,
    reviewedAt: null,
    reviewedBy: null,
    returnNote: null,
    returnedAt: null,
    returnedBy: null,
    overdueMarkedAt: null,
    createdAt: new Date("2026-04-13T09:00:00.000Z"),
    updatedAt: new Date("2026-04-13T09:00:00.000Z"),
    ...overrides
  };
}

describe("weekly report module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("自然周范围按周一到周日计算", async () => {
    const { getNaturalWeekRange, formatWeekKey } = await import("@/lib/week");
    const range = getNaturalWeekRange(new Date("2026-04-17T12:00:00+08:00"));

    expect(formatWeekKey(range.weekStart)).toBe("2026-04-13");
    expect(formatWeekKey(range.weekEnd)).toBe("2026-04-19");
  });

  it("提交前至少需要 done 或 plan", async () => {
    const { validateWeeklyReportSubmission } = await import("@/modules/weekly-reports/service");

    expect(() =>
      validateWeeklyReportSubmission([{ itemType: "risk", content: "阻塞项", priority: "medium" }])
    ).toThrow("至少填写一条本周完成或下周计划后才能提交");
  });

  it("高风险缺少影响说明时不能提交", async () => {
    const { validateWeeklyReportSubmission } = await import("@/modules/weekly-reports/service");

    expect(() =>
      validateWeeklyReportSubmission([
        { itemType: "plan", content: "推进A", priority: "medium" },
        { itemType: "risk", content: "核心成员请假", priority: "high", impactNote: "" }
      ])
    ).toThrow("高风险条目必须填写影响说明后才能提交");
  });

  it("risk flag 由风险条目或暂停状态触发", async () => {
    const { resolveProjectRiskFlag, resolveTrafficLightStatus } = await import("@/modules/project-weekly/service");

    expect(resolveProjectRiskFlag({ riskItemCount: 1, projectStatus: ProjectStatus.IN_PROGRESS })).toBe(true);
    expect(resolveProjectRiskFlag({ riskItemCount: 0, projectStatus: ProjectStatus.PAUSED })).toBe(true);
    expect(resolveProjectRiskFlag({ riskItemCount: 0, projectStatus: ProjectStatus.IN_PROGRESS })).toBe(false);
    expect(resolveTrafficLightStatus({ riskCount: 2, projectStatus: ProjectStatus.IN_PROGRESS, receivableDelta: 0 })).toBe("red");
  });

  it("项目周报可按 done/risk/plan 聚合并优先展示风险项目", async () => {
    const { projectWeeklyService } = await import("@/modules/project-weekly/service");
    mockPrisma.weeklyReport.findMany
      .mockResolvedValueOnce([{ id: 1n }])
      .mockResolvedValueOnce([{ id: 2n }]);
    mockPrisma.weeklyReportItem.findMany
      .mockResolvedValueOnce([
        {
          relatedProjectId: "project-1",
          itemType: "done",
          content: "完成接口联调",
          needCoordination: false,
          priority: "medium"
        },
        {
          relatedProjectId: "project-1",
          itemType: "risk",
          content: "联调环境不稳定",
          needCoordination: true,
          priority: "high"
        },
        {
          relatedProjectId: "project-1",
          itemType: "plan",
          content: "继续推进上线准备",
          needCoordination: false,
          priority: "medium"
        }
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.projectWeeklySnapshot.findMany.mockResolvedValue([]);
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        code: "PROJ-1",
        name: "项目A",
        status: ProjectStatus.IN_PROGRESS,
        createdBy: "owner-1"
      }
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "owner-1", name: "负责人A" }]);

    const result = await projectWeeklyService.listProjectWeeklyOverview(
      {
        week: "2026-04-13"
      },
      {
        id: "user-1",
        username: "dev",
        name: "Dev",
        role: "DELIVERY",
        roleName: "交付",
        roles: [],
        permissions: ["project_weekly:view"]
      }
    );

    expect(result.items[0]?.projectName).toBe("项目A");
    expect(result.items[0]?.doneItems).toContain("完成接口联调");
    expect(result.items[0]?.riskItems).toContain("联调环境不稳定");
    expect(result.items[0]?.planItems).toContain("继续推进上线准备");
    expect(result.items[0]?.trafficLightStatus).toBe("yellow");
  });

  it("提交率按活跃用户口径统计", async () => {
    const { calculateSubmissionStats } = await import("@/modules/management-weekly/service");
    mockPrisma.user.count.mockResolvedValue(5);
    mockPrisma.weeklyReport.count.mockResolvedValueOnce(3).mockResolvedValueOnce(4);

    const result = await calculateSubmissionStats(new Date("2026-04-13T00:00:00.000Z"));

    expect(result).toEqual({
      totalUsers: 5,
      submittedUsers: 3,
      draftUsers: 1,
      submissionRate: 60
    });
  });

  it("获取当前周报时不存在则自动创建", async () => {
    const { weeklyReportService } = await import("@/modules/weekly-reports/service");
    mockPrisma.weeklyReport.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(createReport());
    mockPrisma.weeklyReport.create.mockResolvedValue(createReport());
    mockPrisma.weeklyReportItem.findMany.mockResolvedValue([]);

    const result = await weeklyReportService.getOrCreateCurrentWeeklyReport("user-1");

    expect(mockPrisma.weeklyReport.create).toHaveBeenCalled();
    expect(result.status).toBe("draft");
  });

  it("保存草稿时无权修改他人周报", async () => {
    const { weeklyReportService } = await import("@/modules/weekly-reports/service");
    mockPrisma.weeklyReport.findUnique.mockResolvedValue(
      createReport(1n, {
        userId: "other-user"
      })
    );

    await expect(
      weeklyReportService.saveDraft("1", "user-1", {
        summary: "test",
        items: []
      })
    ).rejects.toThrow("只能修改自己的周报");
  });

  it("普通用户不能查看他人周报", async () => {
    const { weeklyReportService } = await import("@/modules/weekly-reports/service");
    mockPrisma.weeklyReport.findUnique.mockResolvedValue(
      createReport(1n, {
        userId: "other-user"
      })
    );

    await expect(
      weeklyReportService.getReportById("1", {
        id: "user-1",
        username: "dev",
        name: "Dev",
        role: "DELIVERY",
        roleName: "交付",
        roles: [],
        permissions: ["weekly_report:view"]
      })
    ).rejects.toThrow("只能查看自己的周报");
  });

  it("管理端可催办未提交人员", async () => {
    const { weeklyReportService } = await import("@/modules/weekly-reports/service");
    mockPrisma.weeklyReport.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "user-1", name: "张三", username: "zhangsan" }
    ]);
    mockPrisma.weeklyReportReminder.findMany.mockResolvedValue([]);
    mockPrisma.weeklyReportItem.findMany.mockResolvedValue([]);

    const result = await weeklyReportService.remindWeeklyReports(
      "2026-04-13",
      {
        id: "manager-1",
        username: "manager",
        name: "Manager",
        role: "SUPER_ADMIN",
        roleName: "超级管理员",
        roles: [{ id: "r1", code: "SUPER_ADMIN", name: "超级管理员", isSystem: true }],
        permissions: ["management_weekly:view", "weekly_report:change_status"]
      },
      {}
    );

    expect(mockPrisma.weeklyReportReminder.createMany).toHaveBeenCalled();
    expect(result.remindedCount).toBe(1);
  });

  it("可生成周报推荐草稿", async () => {
    const { weeklyReportService } = await import("@/modules/weekly-reports/service");
    mockPrisma.weeklyReport.findUnique.mockResolvedValue(createReport());
    mockPrisma.weeklyReportItem.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 11n,
          reportId: 2n,
          itemType: "plan",
          content: "推进项目A联调",
          priority: "medium",
          needCoordination: false,
          expectedFinishAt: null,
          impactNote: null,
          relatedProjectId: "project-1",
          relatedOpportunityId: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    mockPrisma.weeklyReportSuggestion.findMany.mockResolvedValue([]);
    mockPrisma.project.findMany
      .mockResolvedValueOnce([{ id: "project-1", code: "PROJ-1", name: "项目A" }])
      .mockResolvedValueOnce([{ id: "project-1", code: "PROJ-1", name: "项目A" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "project-1", code: "PROJ-1", name: "项目A" }]);
    mockPrisma.opportunity.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(3);
    mockPrisma.auditLog.findMany.mockResolvedValue([{ entityId: "project-1" }]);

    const result = await weeklyReportService.generateSuggestions(
      {
        id: "user-1",
        username: "dev",
        name: "Dev",
        role: "DELIVERY",
        roleName: "交付",
        roles: [],
        permissions: ["weekly_report:view", "weekly_report:update"]
      },
      {
        week: "2026-04-13"
      }
    );

    expect(mockPrisma.weeklyReportSuggestion.createMany).toHaveBeenCalled();
    expect(result.report.id).toBe("1");
  });

  it("非销售角色不会生成商机推荐条目", async () => {
    const { weeklyReportService } = await import("@/modules/weekly-reports/service");
    mockPrisma.weeklyReport.findUnique.mockResolvedValue(createReport());
    mockPrisma.weeklyReportItem.findMany.mockResolvedValue([]);
    mockPrisma.weeklyReportSuggestion.findMany.mockResolvedValue([]);
    mockPrisma.project.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.opportunity.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    await weeklyReportService.generateSuggestions(
      {
        id: "user-1",
        username: "delivery",
        name: "Delivery",
        role: "DELIVERY",
        roleName: "交付",
        roles: [],
        permissions: ["weekly_report:view", "weekly_report:update"]
      },
      { week: "2026-04-13" }
    );

    const createManyCall = mockPrisma.weeklyReportSuggestion.createMany.mock.calls.at(-1)?.[0];
    const sourceTypes = (createManyCall?.data ?? []).map((item: { sourceType: string }) => item.sourceType);
    expect(sourceTypes).not.toContain("opportunity_update");
  });

  it("可采用单条推荐为正式周报条目", async () => {
    const { weeklyReportService } = await import("@/modules/weekly-reports/service");
    mockPrisma.weeklyReport.findUnique.mockResolvedValue(createReport());
    mockPrisma.weeklyReportItem.findMany.mockResolvedValue([]);
    mockPrisma.weeklyReportSuggestion.findMany
      .mockResolvedValueOnce([
        {
          id: 21n,
          userId: "user-1",
          weekStart: new Date("2026-04-13T00:00:00.000Z"),
          sectionType: "plan",
          sourceType: "last_week_plan",
          sourceRef: "11",
          reason: "来自上周计划",
          content: "继续推进项目A联调",
          relatedProjectId: "project-1",
          relatedOpportunityId: null,
          confidenceScore: 0.9,
          status: "pending",
          extraPayload: { priority: "medium", needCoordination: false },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.project.findMany
      .mockResolvedValueOnce([{ id: "project-1", code: "PROJ-1", name: "项目A" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.opportunity.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    const result = await weeklyReportService.applySuggestions(
      {
        id: "user-1",
        username: "dev",
        name: "Dev",
        role: "DELIVERY",
        roleName: "交付",
        roles: [],
        permissions: ["weekly_report:view", "weekly_report:update"]
      },
      {
        week: "2026-04-13",
        applyAll: false,
        suggestionIds: ["21"]
      }
    );

    expect(mockPrisma.weeklyReportItem.createMany).toHaveBeenCalled();
    expect(mockPrisma.weeklyReportSuggestion.updateMany).toHaveBeenCalled();
    expect(result.items).toBeDefined();
  });

  it("提交周报时会自动生成风险与协同任务", async () => {
    const { weeklyReportService } = await import("@/modules/weekly-reports/service");
    mockPrisma.weeklyReport.findUnique
      .mockResolvedValueOnce(createReport())
      .mockResolvedValueOnce(createReport());
    mockPrisma.weeklyReportItem.findMany
      .mockResolvedValueOnce([
        {
          id: 50n,
          reportId: 1n,
          itemType: "plan",
          content: "继续推进修复",
          priority: "medium",
          needCoordination: false,
          expectedFinishAt: null,
          impactNote: null,
          relatedProjectId: "project-1",
          relatedOpportunityId: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 51n,
          reportId: 1n,
          itemType: "risk",
          content: "生产环境阻塞",
          priority: "high",
          needCoordination: true,
          expectedFinishAt: null,
          impactNote: "影响提测",
          relatedProjectId: "project-1",
          relatedOpportunityId: null,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.project.findMany.mockResolvedValue([{ id: "project-1", createdBy: "owner-1" }]);
    mockPrisma.weeklyTask.findMany.mockResolvedValue([]);
    mockPrisma.weeklyTask.create.mockResolvedValue({
      id: 1n
    });
    mockPrisma.weeklyReport.update.mockResolvedValue(createReport(1n, { status: "submitted", submittedAt: new Date() }));

    await weeklyReportService.submitReport("1", "user-1");

    expect(mockPrisma.weeklyTask.create).toHaveBeenCalledTimes(2);
  });

  it("当前重新提交时若条目ID变化会再次创建任务", async () => {
    const { weeklyTaskService } = await import("@/modules/weekly-tasks/service");
    mockPrisma.project.findMany.mockResolvedValue([{ id: "project-1", createdBy: "owner-1" }]);
    mockPrisma.weeklyTask.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 91n,
          type: "risk",
          content: "生产环境阻塞",
          projectId: "project-1",
          sourceReportId: 1n,
          sourceItemId: 51n,
          creatorId: "user-1",
          assigneeId: "owner-1",
          status: "open",
          priority: "high",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    mockPrisma.weeklyTask.create.mockResolvedValue({ id: 92n });
    mockPrisma.weeklyTask.update.mockResolvedValue({ id: 91n });

    await weeklyTaskService.syncTasksForSubmittedReport({
      reportId: 1n,
      userId: "user-1",
      items: [
        {
          id: 51n,
          itemType: "risk",
          content: "生产环境阻塞",
          priority: "high",
          needCoordination: false,
          relatedProjectId: "project-1"
        }
      ]
    });

    await weeklyTaskService.syncTasksForSubmittedReport({
      reportId: 1n,
      userId: "user-1",
      items: [
        {
          id: 61n,
          itemType: "risk",
          content: "生产环境阻塞",
          priority: "high",
          needCoordination: false,
          relatedProjectId: "project-1"
        }
      ]
    });

    expect(mockPrisma.weeklyTask.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.weeklyTask.update).toHaveBeenCalled();
  });

  it("任务状态可流转", async () => {
    const { weeklyTaskService } = await import("@/modules/weekly-tasks/service");
    mockPrisma.weeklyTask.findUnique.mockResolvedValue({
      id: 71n,
      type: "risk",
      content: "阻塞项",
      projectId: "project-1",
      sourceReportId: 1n,
      sourceItemId: 2n,
      creatorId: "user-1",
      assigneeId: "manager-1",
      status: "open",
      priority: "high",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockPrisma.weeklyTask.update.mockResolvedValue({
      id: 71n,
      type: "risk",
      content: "阻塞项",
      projectId: "project-1",
      sourceReportId: 1n,
      sourceItemId: 2n,
      creatorId: "user-1",
      assigneeId: "manager-1",
      status: "processing",
      priority: "high",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await weeklyTaskService.updateTaskStatus(
      "71",
      { status: "processing" },
      {
        id: "manager-1",
        username: "manager",
        name: "Manager",
        role: "SUPER_ADMIN",
        roleName: "超级管理员",
        roles: [],
        permissions: ["management_weekly:view"]
      }
    );

    expect(result.status).toBe("processing");
  });

  it("管理端可标记风险项目已处理", async () => {
    const { managementWeeklyService } = await import("@/modules/management-weekly/service");
    mockPrisma.projectWeeklySnapshot.findUnique.mockResolvedValue({
      id: 31n,
      projectId: "project-1",
      ownerNote: null
    });
    mockPrisma.projectWeeklySnapshot.update.mockResolvedValue({
      id: 31n,
      ownerNote: "[handled] 2026-04-18T00:00:00.000Z by Manager"
    });

    const result = await managementWeeklyService.markRiskProjectHandled(
      "2026-04-13",
      "project-1",
      {
        id: "manager-1",
        username: "manager",
        name: "Manager",
        role: "SUPER_ADMIN",
        roleName: "超级管理员",
        roles: [],
        permissions: ["management_weekly:view"]
      }
    );

    expect(mockPrisma.projectWeeklySnapshot.update).toHaveBeenCalled();
    expect(result.handled).toBe(true);
  });

  it("项目周报空数据时返回可理解默认态", async () => {
    const { projectWeeklyService } = await import("@/modules/project-weekly/service");
    mockPrisma.weeklyReport.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockPrisma.weeklyReportItem.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockPrisma.projectWeeklySnapshot.findMany.mockResolvedValue([]);

    const result = await projectWeeklyService.listProjectWeeklyOverview(
      { week: "2026-04-13" },
      {
        id: "user-1",
        username: "pm",
        name: "PM",
        role: "PROJECT_MANAGER",
        roleName: "项目经理",
        roles: [],
        permissions: ["project_weekly:view"]
      }
    );

    expect(result).toEqual({
      weekStart: "2026-04-13",
      items: [],
      stats: {
        totalProjects: 0,
        riskProjects: 0,
        coordinationProjects: 0
      }
    });
  });

  it("仅项目周报查看权限不能更新任务状态", async () => {
    const { weeklyTaskService } = await import("@/modules/weekly-tasks/service");
    await expect(
      weeklyTaskService.updateTaskStatus(
        "72",
        { status: "processing" },
        {
          id: "delivery-1",
          username: "delivery",
          name: "Delivery",
          role: "DELIVERY",
          roleName: "交付",
          roles: [],
          permissions: ["project_weekly:view"]
        }
      )
    ).rejects.toThrow("当前账号无权更新任务状态");
  });

  it("仅项目周报查看权限不能标记项目风险", async () => {
    const { projectWeeklyService } = await import("@/modules/project-weekly/service");

    await expect(
      projectWeeklyService.markProjectWeeklyRisk("2026-04-13", "project-1", {
        id: "delivery-1",
        username: "delivery",
        name: "Delivery",
        role: "DELIVERY",
        roleName: "交付",
        roles: [],
        permissions: ["project_weekly:view"]
      })
    ).rejects.toThrow("当前账号无权标记项目风险");
  });
});
