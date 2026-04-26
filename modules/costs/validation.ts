import { CostCategory } from "@prisma/client";
import { z } from "zod";

import { requiredDateSchema } from "@/lib/validation";

export const costCreateSchema = z.object({
  projectId: z.string().min(1, "请选择项目"),
  title: z.string().min(1, "请输入成本标题"),
  category: z.nativeEnum(CostCategory),
  amount: z.coerce.number().positive("请输入有效金额"),
  occurredAt: requiredDateSchema,
  description: z.string().optional()
});

export const costUpdateSchema = costCreateSchema;
