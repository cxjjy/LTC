import { z } from "zod";

import { optionalDateSchema } from "@/lib/validation";

export const weeklyReportPrioritySchema = z.enum(["low", "medium", "high"]);
export const weeklyReportStatusSchema = z.enum(["draft", "submitted", "overdue", "reviewed", "returned"]);
export const weeklyReportSuggestionSourceSchema = z.enum([
  "last_week_plan",
  "active_project",
  "ongoing_risk",
  "coordination",
  "project_update",
  "opportunity_update"
]);
export const weeklyReportSuggestionStatusSchema = z.enum(["pending", "applied", "ignored"]);

export const weeklyReportItemSchema = z.object({
  id: z.string().optional(),
  itemType: z.enum(["done", "plan", "risk"]),
  content: z.string().trim().min(1, "请填写周报内容").max(500, "单条内容不能超过500字"),
  relatedProjectId: z.string().trim().optional().nullable(),
  relatedOpportunityId: z.string().trim().optional().nullable(),
  priority: weeklyReportPrioritySchema.default("medium"),
  needCoordination: z.coerce.boolean().optional().default(false),
  expectedFinishAt: optionalDateSchema.nullable().optional(),
  impactNote: z.string().trim().max(500, "影响说明不能超过500字").optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional()
});

export const weeklyReportSaveSchema = z.object({
  summary: z.string().trim().max(2000, "摘要不能超过2000字").optional().nullable(),
  items: z.array(weeklyReportItemSchema).max(100, "单次最多保存100条周报条目")
});

export const weeklyReportReviewSchema = z.object({
  reviewNote: z.string().trim().max(2000, "审阅意见不能超过2000字").optional().nullable()
});

export const weeklyReportReturnSchema = z.object({
  returnNote: z.string().trim().min(1, "请填写退回说明").max(2000, "退回说明不能超过2000字")
});

export const weeklyReportRemindSchema = z.object({
  targetUserIds: z.array(z.string()).optional(),
  message: z.string().trim().max(255, "催办说明不能超过255字").optional().nullable()
});

export const weeklyReportSuggestionGenerateSchema = z.object({
  week: z.string().trim().optional()
});

export const weeklyReportSuggestionOverrideSchema = z.object({
  id: z.string(),
  content: z.string().trim().min(1, "请填写推荐内容").max(500, "推荐内容不能超过500字"),
  relatedProjectId: z.string().trim().optional().nullable(),
  relatedOpportunityId: z.string().trim().optional().nullable(),
  priority: weeklyReportPrioritySchema.optional(),
  needCoordination: z.coerce.boolean().optional(),
  expectedFinishAt: optionalDateSchema.nullable().optional(),
  impactNote: z.string().trim().max(500, "影响说明不能超过500字").optional().nullable()
});

export const weeklyReportSuggestionApplySchema = z.object({
  week: z.string().trim().optional(),
  applyAll: z.coerce.boolean().optional().default(false),
  suggestionIds: z.array(z.string()).optional(),
  overrides: z.array(weeklyReportSuggestionOverrideSchema).optional()
});

export const weeklyReportSuggestionIgnoreSchema = z.object({
  week: z.string().trim().optional(),
  suggestionIds: z.array(z.string()).min(1, "请至少选择一条推荐")
});
