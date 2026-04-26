import { z } from "zod";

import { optionalDateSchema } from "@/lib/validation";

export const contractCreateSchema = z.object({
  projectId: z.string().min(1, "请选择项目"),
  supplierId: z.string().optional(),
  direction: z.enum(["SALES", "PURCHASE"]).optional(),
  name: z.string().min(1, "请输入合同名称"),
  contractAmount: z.coerce.number().positive("请输入有效金额"),
  signedDate: optionalDateSchema,
  effectiveDate: optionalDateSchema,
  endDate: optionalDateSchema,
  description: z.string().optional()
});

export const contractUpdateSchema = contractCreateSchema;
