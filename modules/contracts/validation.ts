import { ContractStatus } from "@prisma/client";
import { z } from "zod";

import { optionalDateSchema } from "@/lib/validation";

export const contractCreateSchema = z.object({
  projectId: z.string().min(1, "请选择项目"),
  name: z.string().min(1, "请输入合同名称"),
  contractAmount: z.coerce.number().positive("请输入有效金额"),
  signedDate: optionalDateSchema,
  effectiveDate: optionalDateSchema,
  endDate: optionalDateSchema,
  status: z.nativeEnum(ContractStatus).optional(),
  description: z.string().optional()
});

export const contractUpdateSchema = contractCreateSchema.extend({
  status: z.nativeEnum(ContractStatus)
});

export const contractStatusSchema = z.object({
  status: z.nativeEnum(ContractStatus)
});
