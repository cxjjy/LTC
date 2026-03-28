import { OpportunityStage } from "@prisma/client";
import { z } from "zod";

import { optionalDateSchema, optionalNumberSchema } from "@/lib/validation";

export const opportunityCreateSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
  name: z.string().min(1, "请输入商机名称"),
  description: z.string().optional(),
  estimatedRevenue: z.coerce.number().positive("请输入有效预估收入"),
  estimatedLaborCost: z.coerce.number().min(0, "人工成本不能小于 0").default(0),
  estimatedOutsourceCost: z.coerce.number().min(0, "外包成本不能小于 0").default(0),
  estimatedProcurementCost: z.coerce.number().min(0, "采购成本不能小于 0").default(0),
  estimatedTravelCost: z.coerce.number().min(0, "差旅成本不能小于 0").default(0),
  estimatedOtherCost: z.coerce.number().min(0, "其他成本不能小于 0").default(0),
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
