import type { z } from "zod";

import type {
  weeklyReportItemSchema,
  weeklyReportRemindSchema,
  weeklyReportReturnSchema,
  weeklyReportReviewSchema,
  weeklyReportSaveSchema,
  weeklyReportSuggestionApplySchema,
  weeklyReportSuggestionGenerateSchema,
  weeklyReportSuggestionIgnoreSchema
} from "@/modules/weekly-reports/validation";

export type WeeklyReportItemInput = z.infer<typeof weeklyReportItemSchema>;
export type SaveWeeklyReportDraftDto = z.infer<typeof weeklyReportSaveSchema>;
export type ReviewWeeklyReportDto = z.infer<typeof weeklyReportReviewSchema>;
export type ReturnWeeklyReportDto = z.infer<typeof weeklyReportReturnSchema>;
export type RemindWeeklyReportDto = z.infer<typeof weeklyReportRemindSchema>;
export type GenerateWeeklyReportSuggestionsDto = z.infer<typeof weeklyReportSuggestionGenerateSchema>;
export type ApplyWeeklyReportSuggestionsDto = z.infer<typeof weeklyReportSuggestionApplySchema>;
export type IgnoreWeeklyReportSuggestionsDto = z.infer<typeof weeklyReportSuggestionIgnoreSchema>;
