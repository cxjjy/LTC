import { OpportunityStage } from "@prisma/client";
import { z } from "zod";

import { optionalDateSchema, optionalNumberSchema } from "@/lib/validation";

export const opportunityCreateSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
  name: z.string().min(1, "请输入商机名称"),
  description: z.string().optional(),
  amount: z.coerce.number().positive("请输入有效金额"),
  expectedSignDate: optionalDateSchema,
  winRate: optionalNumberSchema,
  stage: z.nativeEnum(OpportunityStage).optional()
});

export const opportunityUpdateSchema = opportunityCreateSchema.extend({
  stage: z.nativeEnum(OpportunityStage)
});

export const convertOpportunitySchema = z.object({
  name: z.string().min(1, "请输入项目名称"),
  description: z.string().optional(),
  budgetAmount: optionalNumberSchema,
  plannedStartDate: optionalDateSchema,
  plannedEndDate: optionalDateSchema
});
