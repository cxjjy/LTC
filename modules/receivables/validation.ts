import { ReceivableStatus } from "@prisma/client";
import { z } from "zod";

import { optionalDateSchema, requiredDateSchema } from "@/lib/validation";

export const receivableCreateSchema = z.object({
  contractId: z.string().min(1, "请选择合同"),
  title: z.string().min(1, "请输入回款标题"),
  amountDue: z.coerce.number().positive("请输入有效金额"),
  dueDate: requiredDateSchema,
  description: z.string().optional()
});

export const receivableUpdateSchema = receivableCreateSchema.extend({
  status: z.nativeEnum(ReceivableStatus).optional(),
  amountReceived: z.coerce.number().min(0).optional(),
  receivedDate: optionalDateSchema
});

export const receivablePaymentSchema = z.object({
  amountReceived: z.coerce.number().min(0, "请输入有效回款金额"),
  receivedDate: optionalDateSchema
});
