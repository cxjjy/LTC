import { ProjectStatus } from "@prisma/client";
import { z } from "zod";

import { optionalDateSchema, optionalNumberSchema } from "@/lib/validation";
import { projectDeliveryModeValues, projectRegionValues } from "@/modules/projects/constants";

const optionalDeliveryModeSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.enum(projectDeliveryModeValues).optional()
);

const optionalRegionSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.enum(projectRegionValues).optional()
);

export const projectCreateSchema = z.object({
  opportunityId: z.string().min(1, "请选择商机"),
  name: z.string().min(1, "请输入项目名称"),
  description: z.string().optional(),
  budgetAmount: optionalNumberSchema,
  plannedStartDate: optionalDateSchema,
  plannedEndDate: optionalDateSchema,
  deliveryMode: optionalDeliveryModeSchema,
  region: optionalRegionSchema,
  ownerName: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional()
});

export const projectUpdateSchema = projectCreateSchema.extend({
  status: z.nativeEnum(ProjectStatus)
});

export const projectStatusSchema = z.object({
  status: z.nativeEnum(ProjectStatus)
});

export const projectSupplierLinkSchema = z.object({
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  role: z.string().optional(),
  remark: z.string().optional()
}).refine((value) => Boolean(value.supplierId?.trim() || value.supplierName?.trim()), {
  message: "请选择供应商或输入供应商名称",
  path: ["supplierId"]
});
