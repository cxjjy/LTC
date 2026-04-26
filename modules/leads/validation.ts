import { LeadStatus } from "@prisma/client";
import { z } from "zod";

import { optionalDateSchema, optionalNumberSchema } from "@/lib/validation";

export const leadCreateSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
  title: z.string().min(1, "请输入线索标题"),
  source: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  expectedAmount: optionalNumberSchema,
  expectedCloseDate: optionalDateSchema,
  latestFollowUpAt: optionalDateSchema,
  description: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional()
});

export const leadUpdateSchema = leadCreateSchema.extend({
  status: z.nativeEnum(LeadStatus)
});

export const convertLeadSchema = z.object({
  name: z.string().min(1, "请输入商机名称"),
  amount: z.coerce.number().positive("商机金额必须大于 0"),
  expectedSignDate: optionalDateSchema,
  winRate: z.coerce.number().min(0).max(100).optional(),
  description: z.string().optional()
});
