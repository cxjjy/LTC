import type { SessionUser } from "@/lib/auth";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { canAccessRecord, hasPermission } from "@/lib/rbac";
import { logWeeklyReportAudit } from "@/lib/weekly-report-audit";
import { weeklyTaskStatusLabels, weeklyTaskTypeLabels } from "@/lib/constants";
import type { UpdateWeeklyTaskStatusDto } from "@/modules/weekly-tasks/dto";

function getWeeklyTaskModel() {
  const model = (prisma as any).weeklyTask;
  if (!model) {
    throw badRequest("周报任务模型未初始化，请刷新页面或重启服务后重试");
  }
  return model;
}

type WeeklyTaskRecord = {
  id: bigint;
  type: string;
  content: string;
  projectId: string | null;
  sourceReportId: bigint;
  sourceItemId: bigint | null;
  creatorId: string;
  assigneeId: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
};

function serializeTask(
  task: WeeklyTaskRecord,
  context?: {
    projectMap?: Map<string, { id: string; code: string; name: string }>;
    userMap?: Map<string, { id: string; name: string }>;
  }
) {
  const project = task.projectId ? context?.projectMap?.get(task.projectId) : undefined;
  const assignee = context?.userMap?.get(task.assigneeId);

  return {
    id: task.id.toString(),
    type: task.type as "risk" | "collaboration",
    typeLabel: weeklyTaskTypeLabels[task.type as keyof typeof weeklyTaskTypeLabels] ?? task.type,
    content: task.content,
    projectId: task.projectId,
    project: project
      ? {
          id: project.id,
          label: `${project.code} / ${project.name}`
        }
      : null,
    sourceReportId: task.sourceReportId.toString(),
    sourceItemId: task.sourceItemId?.toString() ?? null,
    creatorId: task.creatorId,
    assigneeId: task.assigneeId,
    assigneeName: assignee?.name ?? task.assigneeId,
    status: task.status as "open" | "processing" | "done",
    statusLabel: weeklyTaskStatusLabels[task.status as keyof typeof weeklyTaskStatusLabels] ?? task.status,
    priority: task.priority,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}

class WeeklyTaskService {
  async syncTasksForSubmittedReport(input: {
    reportId: bigint;
    userId: string;
    items: Array<{
      id: bigint;
      itemType: string;
      content: string;
      priority: string;
      needCoordination: boolean;
      relatedProjectId: string | null;
    }>;
  }) {
    const projectIds = Array.from(
      new Set(input.items.map((item) => item.relatedProjectId).filter((value): value is string => Boolean(value)))
    );
    const projects = projectIds.length
      ? await prisma.project.findMany({
          where: { id: { in: projectIds }, isDeleted: false },
          select: { id: true, createdBy: true }
        })
      : [];
    const projectOwnerMap = new Map(projects.map((item) => [item.id, item.createdBy]));
    const weeklyTaskModel = getWeeklyTaskModel();
    const existingTasks = (await weeklyTaskModel.findMany({
      where: {
        sourceReportId: input.reportId,
        status: { in: ["open", "processing"] }
      }
    })) as WeeklyTaskRecord[];
    const existingMap = new Map(
      existingTasks.map((item) => [`${item.type}:${item.sourceItemId?.toString() ?? ""}`, item])
    );
    const existingContentMap = new Map(
      existingTasks.map((item) => [`${item.type}:${item.projectId ?? ""}:${item.content.trim()}`, item])
    );

    const taskSeeds = input.items.flatMap((item) => {
      const seeds: Array<{
        type: "risk" | "collaboration";
        content: string;
        projectId: string | null;
        sourceItemId: bigint;
        creatorId: string;
        assigneeId: string;
        priority: string;
      }> = [];

      if (item.itemType === "risk" && item.content.trim()) {
        seeds.push({
          type: "risk",
          content: item.content.trim(),
          projectId: item.relatedProjectId,
          sourceItemId: item.id,
          creatorId: input.userId,
          assigneeId: projectOwnerMap.get(item.relatedProjectId ?? "") ?? input.userId,
          priority: item.priority === "low" ? "medium" : item.priority
        });
      }

      if (item.needCoordination && item.content.trim()) {
        seeds.push({
          type: "collaboration",
          content: item.content.trim(),
          projectId: item.relatedProjectId,
          sourceItemId: item.id,
          creatorId: input.userId,
          assigneeId: projectOwnerMap.get(item.relatedProjectId ?? "") ?? input.userId,
          priority: item.priority
        });
      }

      return seeds;
    });

    for (const seed of taskSeeds) {
      const key = `${seed.type}:${seed.sourceItemId.toString()}`;
      const contentKey = `${seed.type}:${seed.projectId ?? ""}:${seed.content}`;
      const existing = existingMap.get(key) ?? existingContentMap.get(contentKey);
      if (existing) {
        await weeklyTaskModel.update({
          where: { id: existing.id },
          data: {
            content: seed.content,
            projectId: seed.projectId,
            sourceItemId: seed.sourceItemId,
            assigneeId: seed.assigneeId,
            priority: seed.priority
          }
        });
        continue;
      }

      const created = (await weeklyTaskModel.create({
        data: {
          type: seed.type,
          content: seed.content,
          projectId: seed.projectId,
          sourceReportId: input.reportId,
          sourceItemId: seed.sourceItemId,
          creatorId: seed.creatorId,
          assigneeId: seed.assigneeId,
          status: "open",
          priority: seed.priority
        }
      })) as WeeklyTaskRecord;

      await logWeeklyReportAudit({
        action: "create_task",
        entityType: "weekly_task",
        entityId: created.id.toString(),
        operatorUserId: input.userId
      });
    }
  }

  async listTasksForProjects(projectIds: string[]) {
    const filteredProjectIds = projectIds.filter(Boolean);
    if (!filteredProjectIds.length) {
      return [];
    }
    const weeklyTaskModel = getWeeklyTaskModel();
    const tasks = ((await weeklyTaskModel.findMany({
      where: {
        projectId: { in: filteredProjectIds }
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }]
    })) as WeeklyTaskRecord[] | undefined) ?? [];
    const assigneeIds = Array.from(new Set(tasks.map((item) => item.assigneeId)));
    const users = assigneeIds.length
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, name: true }
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id, item]));

    return tasks.map((task) => serializeTask(task, { userMap }));
  }

  async listPendingTasks() {
    const weeklyTaskModel = getWeeklyTaskModel();
    const tasks = (await weeklyTaskModel.findMany({
      where: { status: { in: ["open", "processing"] } },
      orderBy: [{ type: "asc" }, { priority: "desc" }, { updatedAt: "desc" }]
    })) as WeeklyTaskRecord[];
    const projectIds = Array.from(new Set(tasks.map((item) => item.projectId).filter((value): value is string => Boolean(value))));
    const assigneeIds = Array.from(new Set(tasks.map((item) => item.assigneeId)));
    const [projects, users] = await Promise.all([
      projectIds.length
        ? prisma.project.findMany({
            where: { id: { in: projectIds }, isDeleted: false },
            select: { id: true, code: true, name: true }
          })
        : Promise.resolve([]),
      assigneeIds.length
        ? prisma.user.findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, name: true }
          })
        : Promise.resolve([])
    ]);
    const projectMap = new Map(projects.map((item) => [item.id, item]));
    const userMap = new Map(users.map((item) => [item.id, item]));

    return {
      high: tasks.filter((task) => task.type === "risk").map((task) => serializeTask(task, { projectMap, userMap })),
      medium: tasks.filter((task) => task.type === "collaboration").map((task) => serializeTask(task, { projectMap, userMap }))
    };
  }

  async countOpenTasksByAssignee(userIds: string[]) {
    const filteredUserIds = userIds.filter(Boolean);
    if (!filteredUserIds.length) {
      return new Map<string, number>();
    }
    const weeklyTaskModel = getWeeklyTaskModel();
    const rows = ((await weeklyTaskModel.findMany({
      where: {
        assigneeId: { in: filteredUserIds },
        status: { in: ["open", "processing"] }
      },
      select: {
        assigneeId: true
      }
    })) as Array<{ assigneeId: string }> | undefined) ?? [];
    const counter = new Map<string, number>();
    rows.forEach((row) => {
      counter.set(row.assigneeId, (counter.get(row.assigneeId) ?? 0) + 1);
    });
    return counter;
  }

  async updateTaskStatus(taskId: string, payload: UpdateWeeklyTaskStatusDto, user: SessionUser) {
    const canManageTask =
      hasPermission(user, "weekly_report:change_status") ||
      canAccessRecord(user, "project", "update") ||
      canAccessRecord(user, "project", "status");

    if (!canManageTask) {
      throw forbidden("当前账号无权更新任务状态");
    }
    let parsedId: bigint;
    try {
      parsedId = BigInt(taskId);
    } catch {
      throw badRequest("任务ID不正确");
    }
    const weeklyTaskModel = getWeeklyTaskModel();
    const task = (await weeklyTaskModel.findUnique({ where: { id: parsedId } })) as WeeklyTaskRecord | null;
    if (!task) {
      throw notFound("任务不存在");
    }
    const updated = (await weeklyTaskModel.update({
      where: { id: parsedId },
      data: {
        status: payload.status
      }
    })) as WeeklyTaskRecord;
    await logWeeklyReportAudit({
      action: `task_${payload.status}`,
      entityType: "weekly_task",
      entityId: updated.id.toString(),
      operatorUserId: user.id
    });
    return serializeTask(updated);
  }
}

export const weeklyTaskService = new WeeklyTaskService();
