import { prisma } from "@/lib/prisma";

type WeeklyAuditInput = {
  action: string;
  entityType:
    | "weekly_report"
    | "weekly_report_item"
    | "project_weekly_snapshot"
    | "management_weekly_view"
    | "weekly_report_reminder"
    | "weekly_report_suggestion"
    | "weekly_task";
  entityId: string;
  operatorUserId: string;
};

export async function logWeeklyReportAudit(input: WeeklyAuditInput) {
  return prisma.weeklyReportAuditRef.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      operatorUserId: input.operatorUserId
    }
  });
}
