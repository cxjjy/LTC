import { z } from "zod";

import { optionalDateSchema, optionalNumberSchema } from "@/lib/validation";

export const paymentRecordCreateSchema = z.object({
  paymentAmount: z.coerce.number().positive("请输入有效回款金额"),
  paymentDate: optionalDateSchema.refine((value) => Boolean(value), "请选择回款日期"),
  paymentMethod: z.string().optional(),
  payerName: z.string().optional(),
  remark: z.string().optional()
});

export const paymentRecordUpdateSchema = z.object({
  paymentAmount: optionalNumberSchema,
  paymentDate: optionalDateSchema,
  paymentMethod: z.string().optional(),
  payerName: z.string().optional(),
  remark: z.string().optional()
}).refine((value) => value.paymentAmount !== undefined && value.paymentAmount > 0, {
  message: "请输入有效回款金额",
  path: ["paymentAmount"]
}).refine((value) => Boolean(value.paymentDate), {
  message: "请选择回款日期",
  path: ["paymentDate"]
});
