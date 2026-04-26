import { z } from "zod";

export const customerCreateSchema = z.object({
  name: z.string().min(1, "请输入客户名称"),
  industry: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  remark: z.string().optional()
});

export const customerUpdateSchema = customerCreateSchema;
