import { ProjectStatus } from "@prisma/client";
import { z } from "zod";

import { optionalDateSchema, optionalNumberSchema } from "@/lib/validation";

export const projectCreateSchema = z.object({
  opportunityId: z.string().min(1, "请选择商机"),
  name: z.string().min(1, "请输入项目名称"),
  description: z.string().optional(),
  budgetAmount: optionalNumberSchema,
  plannedStartDate: optionalDateSchema,
  plannedEndDate: optionalDateSchema,
  status: z.nativeEnum(ProjectStatus).optional()
});

export const projectUpdateSchema = projectCreateSchema.extend({
  status: z.nativeEnum(ProjectStatus)
});

export const projectStatusSchema = z.object({
  status: z.nativeEnum(ProjectStatus)
});
