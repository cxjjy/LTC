import type { z } from "zod";

import type { weeklyTaskUpdateStatusSchema } from "@/modules/weekly-tasks/validation";

export type UpdateWeeklyTaskStatusDto = z.infer<typeof weeklyTaskUpdateStatusSchema>;
