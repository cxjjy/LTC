import { z } from "zod";

export const weeklyTaskTypeSchema = z.enum(["risk", "collaboration"]);
export const weeklyTaskStatusSchema = z.enum(["open", "processing", "done"]);

export const weeklyTaskUpdateStatusSchema = z.object({
  status: weeklyTaskStatusSchema
});
