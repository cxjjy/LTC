import { z } from "zod";

import { invoiceStatusOptions, invoiceTypeOptions } from "@/lib/constants";
import { optionalDateSchema, optionalNumberSchema } from "@/lib/validation";

const invoiceTypeSchema = z.enum(invoiceTypeOptions.map((item) => item.value) as [string, ...string[]], {
  message: "请选择发票类型"
});

const invoiceStatusSchema = z.enum(invoiceStatusOptions.map((item) => item.value) as [string, ...string[]], {
  message: "请选择发票状态"
});

export const invoiceRecordCreateSchema = z.object({
  invoiceNo: z.string().min(1, "请输入发票号码"),
  invoiceType: invoiceTypeSchema,
  invoiceAmount: z.coerce.number().positive("请输入有效开票金额"),
  invoiceDate: optionalDateSchema.refine((value) => Boolean(value), "请选择开票日期"),
  payerName: z.string().optional(),
  status: invoiceStatusSchema.default("issued"),
  remark: z.string().optional()
});

export const invoiceRecordUpdateSchema = invoiceRecordCreateSchema.extend({
  invoiceDate: optionalDateSchema,
  attachmentRemark: z.string().optional(),
  attachmentStatus: z.string().optional(),
  invoiceAmount: optionalNumberSchema
}).refine((value) => Boolean(value.invoiceDate), {
  message: "请选择开票日期",
  path: ["invoiceDate"]
}).refine((value) => value.invoiceAmount !== undefined && value.invoiceAmount > 0, {
  message: "请输入有效开票金额",
  path: ["invoiceAmount"]
});

export const invoiceAttachmentMetaSchema = z.object({
  remark: z.string().optional(),
  status: z.string().optional()
});
