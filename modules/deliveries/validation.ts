import { DeliveryStatus } from "@prisma/client";
import { z } from "zod";

import { optionalDateSchema } from "@/lib/validation";

export const deliveryCreateSchema = z.object({
  projectId: z.string().min(1, "请选择项目"),
  title: z.string().min(1, "请输入交付标题"),
  description: z.string().optional(),
  ownerName: z.string().optional(),
  plannedDate: optionalDateSchema,
  actualDate: optionalDateSchema,
  acceptanceDate: optionalDateSchema,
  status: z.nativeEnum(DeliveryStatus).optional()
});

export const deliveryUpdateSchema = deliveryCreateSchema.extend({
  status: z.nativeEnum(DeliveryStatus)
});
